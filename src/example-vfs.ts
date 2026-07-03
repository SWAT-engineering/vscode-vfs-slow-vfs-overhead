import { Disposable, Event, EventEmitter, FileChangeEvent, FileStat, FileSystemError, FileSystemProvider, FileType, LogOutputChannel, Uri } from "vscode";

// no directories, just a single list of files
export class ExampleVFS implements FileSystemProvider {
	private _emitter = new EventEmitter<FileChangeEvent[]>();
	readonly onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;
    private readonly files = new Map<string, FileEntry>();

    constructor(private readonly logger: LogOutputChannel) {

    }

    readDirectory(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> {
        if (uri.path !== '/') {
            throw FileSystemError.FileNotFound(uri);
        }
        return [...this.files.keys()].map(f => [f, FileType.File]);
    }

    private locate(uri: Uri) {
        const result = this.files.get(uri.path.substring(1));
        if (!result) {
            throw FileSystemError.FileNotFound(uri);
        }
        return result;
    }

    stat(uri: Uri): FileStat | Thenable<FileStat> {
        return this.locate(uri).stat();
    }

    readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
        return this.locate(uri).read();
    }
    writeFile(uri: Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
        const key = uri.path.substring(1);
        const existing = this.files.get(key);
        if (!existing && !options.create) {
            throw FileSystemError.FileNotFound(uri);
        }
        if (existing && !options.overwrite) {
            throw FileSystemError.FileExists(uri);
        }
        if (existing) {
            return existing.write(content);
        }
        this.files.set(key, new FileEntry(content));
    }

    delete(uri: Uri, options: { readonly recursive: boolean; }): void | Thenable<void> {
        throw new Error("Method not implemented.");
    }
    rename(oldUri: Uri, newUri: Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error("Method not implemented.");
    }
    watch(uri: Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): Disposable {
        throw new Error("Method not implemented.");
    }
    createDirectory(uri: Uri): void | Thenable<void> {
        throw new Error("Method not implemented.");
    }

}

class FileEntry {
    private readonly ctime: number;
    private mtime: number;

    constructor(private contents: Uint8Array) {
        this.ctime = new Date().valueOf();
        this.mtime = this.ctime;
    }

    async stat(): Promise<FileStat> {
        return {
            ctime: this.ctime,
            mtime: this.mtime,
            size: this.contents.length,
            type: FileType.File
        };
    }

    async write(content: Uint8Array) {
        this.contents = content.slice();
        this.mtime = new Date().valueOf();
    }
    async read() : Promise<Uint8Array> {
        return this.contents;
    }
}