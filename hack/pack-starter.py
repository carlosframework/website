#!/usr/bin/env python3
# 🤖 Deterministic tar and gzip metadata; deflate bytes depend on the local zlib.
# Publication metadata stays outside the archive and hashes the published bytes.
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import stat
import tarfile
import unicodedata

ROOT_FILES = ('LICENSE.fiesta', 'go.mod', 'go.sum', 'main.go')
SOURCE_TREES = ('static', 'templates')
FORBIDDEN = {'.git', '.hg', '.svn', '.bzr', 'vendor', 'go.work', 'go.work.sum'}
LOCK_SHA256 = 'a858eb184a5255068a4a56470e3549a2a7d4718635a90fe69f40e9faff3948c5'
FIXTURE_HASHES = {
    'go.mod': '78a1f3d56026dc3efa3a9456dc7a39c63672bafcf0bb04944c075eac6e601180',
    'go.sum': '688bf53e93ba1ba280fc924446986ab2cf32fba7c4f16efaf80a8c6e36848b49',
}


def check_compressed_size(size):
    if size > 5_000_000:
        raise ValueError('compressed bytes exceed 5000000')


def inventory(source):
    if source.is_symlink() or not source.is_dir():
        raise ValueError('source must be an ordinary directory')
    entries = []
    files = directories = expanded = 0

    def visit(path):
        nonlocal files, directories, expanded
        name = path.relative_to(source).as_posix()
        parts = name.split('/')
        if (any(p in FORBIDDEN or p in ('', '.', '..') for p in parts)
                or any(c in name for c in '\\:\0')
                or any(unicodedata.category(c) in ('Cc', 'Cf', 'Cs') for c in name)
                or (len(parts) > 1 and parts[-1] in ('go.mod', 'go.sum'))):
            raise ValueError('unsafe path: ' + repr(name))
        info = path.lstat()
        if stat.S_ISDIR(info.st_mode):
            directories += 1
            if directories > 256:
                raise ValueError('directory count exceeds 256')
            entries.append((name, True, b''))
            for child in sorted(path.iterdir()):
                visit(child)
        elif stat.S_ISREG(info.st_mode) and info.st_nlink == 1:
            if (name.endswith(('_test.go', '.db', '.sqlite', '.sqlite3', '.db-wal', '.db-shm'))
                    or path.suffix.lower() in ('.s', '.syso', '.c', '.h', '.cc', '.cpp', '.cxx', '.m', '.mm', '.f', '.for', '.f90', '.o', '.a', '.swig', '.swigcxx', '.pgo')):
                raise ValueError('non-source file: ' + repr(name))
            files += 1
            expanded += info.st_size
            if files > 256 or info.st_size > 2_000_000 or expanded > 20_000_000:
                raise ValueError('file count, file bytes or expanded bytes exceed cap')
            with path.open('rb') as f:
                body = f.read(2_000_001)
            if len(body) != info.st_size:
                raise ValueError('file changed during packing')
            entries.append((name, False, body))
        else:
            raise ValueError('links and special files are forbidden: ' + repr(name))

    for name in (*ROOT_FILES, *SOURCE_TREES):
        path = source / name
        if name in ROOT_FILES and not stat.S_ISREG(path.lstat().st_mode):
            raise ValueError('required file is not regular: ' + name)
        if name in SOURCE_TREES and not stat.S_ISDIR(path.lstat().st_mode):
            raise ValueError('required tree is not a directory: ' + name)
        visit(path)
    return sorted(entries)


def pack_starter(source: Path, output: Path) -> None:
    source, output = Path(source), Path(output)
    if output.resolve().is_relative_to(source.resolve()):
        raise ValueError('output must be outside source')
    if output.is_symlink() or (output.exists() and output.stat().st_nlink != 1):
        raise ValueError('output must not be a link')
    entries = inventory(source)
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode='w', format=tarfile.USTAR_FORMAT) as archive:
        for name, directory, body in entries:
            header = tarfile.TarInfo(name)
            header.type = tarfile.DIRTYPE if directory else tarfile.REGTYPE
            header.mode = 0o755 if directory else 0o644
            header.size = len(body)
            header.uid = header.gid = header.mtime = 0
            header.uname = header.gname = ''
            archive.addfile(header, io.BytesIO(body))
    compressed = io.BytesIO()
    with gzip.GzipFile(filename='', mode='wb', fileobj=compressed, mtime=0, compresslevel=9) as stream:
        stream.write(raw.getvalue())
    data = compressed.getvalue()
    check_compressed_size(len(data))
    output.write_bytes(data)


def publish(archive, destination, platform):
    lock = (platform / 'internal/demobuild/toolchain.lock.json').read_bytes()
    if hashlib.sha256(lock).hexdigest() != LOCK_SHA256:
        raise ValueError('platform lock differs from v1 lock')
    commit_file = platform / '.commit'
    if commit_file.exists():
        commit = commit_file.read_text().strip()
    else:
        import subprocess
        commit = subprocess.check_output(['git', '-C', str(platform), 'rev-parse', 'HEAD'], text=True).strip()
    if not re.fullmatch('[0-9a-f]{40}', commit):
        raise ValueError('invalid platform commit')
    data = archive.read_bytes()
    listing = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tar:
        for member in tar:
            if member.isfile():
                listing[member.name] = tar.extractfile(member).read().decode('utf-8')
    for name, expected in FIXTURE_HASHES.items():
        fixture = (platform / 'internal/console/testdata/demo' / name).read_bytes()
        if hashlib.sha256(fixture).hexdigest() != expected or listing[name].encode() != fixture:
            raise ValueError('module fixture differs: ' + name)
    manifest = {
        'schema': 1,
        'archiveSHA256': hashlib.sha256(data).hexdigest(),
        'files': [{'path': name, 'sha256': hashlib.sha256(body.encode()).hexdigest()} for name, body in listing.items()],
        'platformCommit': commit,
        'lockSHA256': LOCK_SHA256,
        'fiesta': {'version': '1.1.0', 'commit': '4ee76b5e651ff4fb5a4bae12d7508f55a2531eff'},
    }
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'source.tar.gz').write_bytes(data)
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (destination / 'source.json').write_text(json.dumps(listing, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--publish', type=Path)
    parser.add_argument('--platform', type=Path)
    args = parser.parse_args()
    if args.publish and not args.platform:
        parser.error('--publish requires --platform')
    pack_starter(args.source, args.output)
    if args.publish:
        publish(args.output, args.publish, args.platform)
