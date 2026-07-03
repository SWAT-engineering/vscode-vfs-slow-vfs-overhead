import * as vscode from 'vscode';
import { ExampleVFS } from './example-vfs';
import path, { join } from 'path';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dir } from 'console';

const SCHEMA = "example-bench";

export function activate(context: vscode.ExtensionContext) {
	const logger = vscode.window.createOutputChannel("Bench VFS", {log: true});
	context.subscriptions.push(logger);

	logger.info("Starting VFS");
	const vfs = new ExampleVFS(logger);

	logger.info("Registering VFS");
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider(SCHEMA, vfs));
	context.subscriptions.push(vscode.commands.registerCommand('start-bench', () => {
		logger.show();
		logger.info("**** Starting new round of benchmark ***");
		void startBenchmark(logger, vfs);
	}));

}

export function deactivate() {}

async function startBenchmark(logger: vscode.LogOutputChannel, vfs: ExampleVFS) {
	await fileBenchmark(logger);
	await vfsBenchmark(logger, vfs);
}

async function fileBenchmark(logger: vscode.LogOutputChannel) {
	logger.info("starting file:/// benchmark");
	const dir = vscode.Uri.file(await mkdtemp(join(tmpdir(), "bench1")));
	try {
		await benchFiles(logger, dir, new NodeDirectVFS());
	}
	finally {
		await rm(dir.path, {recursive: true});
	}
}

async function vfsBenchmark(logger: vscode.LogOutputChannel, vfs: ExampleVFS) {
	logger.info("starting VFS benchmark");
	return benchFiles(logger, vscode.Uri.from({scheme: SCHEMA, path: '/'}), vfs);
}

type FSLite = Omit<vscode.FileSystemProvider, 'watch' | 'onDidChangeFile' | 'copy' | 'delete' | 'rename' | 'copy' | 'createDirectory'>;

const AMOUNT_OF_FILES = 1000;
async function benchFiles(logger: vscode.LogOutputChannel, root: vscode.Uri, target: FSLite) {
	const files: vscode.Uri[] = [];
	for (let i = 0; i < AMOUNT_OF_FILES; i++) {
		const file = vscode.Uri.joinPath(root, `file-${i}.txt`);
		await target.writeFile(file, Buffer.from("Hello"), { create: true, overwrite: true});
		files.push(file);
	}
	await bench(logger, "readDirectory", target, async fs => {
		for (let t = 0; t < 100; t++) {
 			await fs.readDirectory(root);
		}
	});

	await bench(logger, "stat", target, async fs => {
		for (let t = 0; t < 10; t++) {
			// fine to do in parallel. else a bit ot degenerate of a test case
			await Promise.all(files.map(f => fs.stat(f)))
		}
	});

	await bench(logger, "readFile", target, async fs => {
		for (let t = 0; t < 10; t++) {
			// fine to do in parallel. else a bit ot degenerate of a test case
			await Promise.all(files.map(f => fs.readFile(f)))
		}
	});

}

async function bench(logger: vscode.LogOutputChannel, name: string, target: FSLite, action: (fs: FSLite) => Promise<any> ) {
	const startRegular = performance.now();
	await action(vscode.workspace.fs);
	const stopRegular = performance.now();
	const regularTime = stopRegular - startRegular;
	logger.info(`[${name}] via workspace.fs: ${(regularTime.toFixed(1))}ms`);
	const startDirect = performance.now();
	await action(target);
	const stopDirect = performance.now();
	const directTime = stopDirect - startDirect;
	logger.info(`[${name}] direct: ${(directTime.toFixed(1))}ms`);
	logger.info(`[${name}] Direct is ${(regularTime - directTime).toFixed(1)}ms faster (${(regularTime/directTime).toFixed(1)}x speedup)`);
}

// wrapper class such that the bench function can be shared
class NodeDirectVFS implements FSLite {
	async stat(uri: vscode.Uri) {
		const result = await stat(uri.path);
		return {
			ctime: result.ctime.valueOf(),
			mtime: result.mtime.valueOf(),
			size: result.size,
			type: result.isFile() ? vscode.FileType.File : vscode.FileType.Directory,
		};
	}
	async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		return (await readdir(uri.path, { withFileTypes: true}))
			.map(e => [e.name, e.isFile() ? vscode.FileType.File : vscode.FileType.Directory]);
	}
	readFile(uri: vscode.Uri) {
		return readFile(uri.path);
	}
	writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
		return writeFile(uri.path, content);
	}
}
