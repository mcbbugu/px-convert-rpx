const { log } = require('console');
const vscode = require('vscode');
const fs = require('fs');

function activate(context) {

	let disposable = vscode.commands.registerTextEditorCommand('extension.convertSelectedPxToRpx', (textEditor, edit) => {
		const selection = textEditor.selection;
		const document = textEditor.document;
		let text;

		if (!selection.isEmpty) {
			text = document.getText(selection);
		} else {
			text = document.getText();
		}

		const textWithRpx = convertPxToRpx(text)

		if (!selection.isEmpty) {
			edit.replace(selection, textWithRpx);
		} else {
			const lastLine = document.lineAt(document.lineCount - 1);
			const selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(lastLine.lineNumber, lastLine.text.length));
			textEditor.edit(edit => {
				edit.replace(selection, textWithRpx);
			});
			vscode.window.showInformationMessage(`px 单位已经成功转换为 rpx 单位。`);
		}
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerTextEditorCommand('extension.convertSelectedRpxToPx', (textEditor, edit) => {
		const selection = textEditor.selection;
		const document = textEditor.document;
		let text;

		if (!selection.isEmpty) {
			text = document.getText(selection);
		} else {
			text = document.getText();
		}

		const textWithPx = convertRpxToPx(text)

		if (!selection.isEmpty) {
			edit.replace(selection, textWithPx);
		} else {
			const lastLine = document.lineAt(document.lineCount - 1);
			const selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(lastLine.lineNumber, lastLine.text.length));
			textEditor.edit(edit => {
				edit.replace(selection, textWithPx);
			});
		}
		vscode.window.showInformationMessage(`rpx 单位已经成功转换为 px 单位。`);
	});

	context.subscriptions.push(disposable);

	// px to rpx
	function convertPxToRpx(fileText) {
		const configuration = vscode.workspace.getConfiguration('pxtotorpx');
		const designWidth = configuration.designWidth;
		console.log(`designWidth: ${designWidth}`);
		const rePx = /(\d+(?:\.\d+)?)px/g;
		const textWithRpx = fileText.replace(rePx, function ($0, $1) {
			const pxValue = parseFloat($1);
			const rpxValue = 750 * pxValue / designWidth;
			return `${rpxValue.toFixed(2)}rpx`;
		});

		return textWithRpx;
	}

	// rpx to px
	function convertRpxToPx(fileText) {
		const configuration = vscode.workspace.getConfiguration('pxtotorpx');
		const designWidth = configuration.designWidth;
		console.log(`designWidth: ${designWidth}`);
		const reRpx = /(\d+(?:\.\d+)?)rpx/g; // 修改正则匹配规则

		const textWithPx = fileText.replace(reRpx, function ($0, $1) { // 将 px 替换为 rpx
			const rpxValue = parseFloat($1);
			const pxValue = rpxValue * designWidth / 750;
			return `${pxValue.toFixed(0)}px`;
		});

		return textWithPx;
	}

	const convertFolderCommand = vscode.commands.registerCommand('extension.convertFolder', (folderUri) => {
		if (folderUri) {
			const folderPath = folderUri.path; // 获取文件夹路径
			vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, "*.{vue}")).then((files) => {
				files.forEach((fileUri) => {
					const fileContent = vscode.workspace.fs.readFile(fileUri).then((content) => {
						const fileText = content.toString();
						const convertedText = convertPxToRpx(fileText); // 调用单个文件转换代码

						vscode.workspace.fs.writeFile(fileUri, Buffer.from(convertedText));
					});
				});
				vscode.window.showInformationMessage(`Successfully convert ${files.length} files! px to rpx`);
			});
		}
	});
	context.subscriptions.push(convertFolderCommand);


	const convertFolderCommandRpxToPx = vscode.commands.registerCommand('extension.convertFolderRpxToPx', (folderUri) => {
		if (folderUri) {
			const folderPath = folderUri.path; // 获取文件夹路径
			vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, "*.{vue}")).then((files) => {
				files.forEach((fileUri) => {
					const fileContent = vscode.workspace.fs.readFile(fileUri).then((content) => {
						const fileText = content.toString();
						const convertedText = convertRpxToPx(fileText); // 调用单个文件转换代码

						vscode.workspace.fs.writeFile(fileUri, Buffer.from(convertedText));
					});
				});
				vscode.window.showInformationMessage(`Successfully convert ${files.length} files! rpx to px`);
			});
		}
	});
	context.subscriptions.push(convertFolderCommandRpxToPx);




	async function convertFolder(folderPath, type) {
		try {
			const extensions = ['css', 'vue', 'wxss', 'wxml', 'html', 'js', 'php', 'jsx'];

			const filePattern = `**/*.{${extensions.join(',')}}`;

			const files = await vscode.workspace.findFiles(filePattern, {
				base: folderPath,
				include: `${folderPath}/**`,
			});

			const result = files.filter(file => file.path.startsWith(folderPath));
			console.log(result, "result");

			for (const file of result) {
				const document = await vscode.workspace.openTextDocument(file);
				await convertDocument(document, type);
			}

			if(type == 1){
				vscode.window.showInformationMessage(`文件夹下的所有文件中 px 单位已经成功转换为 rpx 单位。`);
			}else{
				vscode.window.showInformationMessage(`文件夹下的所有文件中 rpx 单位已经成功转换为 px 单位。`);
			}
		} catch (error) {
			console.error(error);
			vscode.window.showErrorMessage(`转换过程中发生错误：${error.message}`);
		}
	}


	async function convertDocument(document, type) {
		const originalContent = document.getText();
		let convertedContent = ''
		if (type === 1) {
			convertedContent = convertPxToRpx(originalContent);
		} else {
			convertedContent = convertRpxToPx(originalContent);
		}
		if (originalContent !== convertedContent) {
			const edit = new vscode.WorkspaceEdit();
			const start = new vscode.Position(0, 0);
			const end = document.lineAt(document.lineCount - 1).range.end;
			const wholeRange = new vscode.Range(start, end);
			edit.replace(document.uri, wholeRange, convertedContent);
			await vscode.workspace.applyEdit(edit);
		}
	}

	context.subscriptions.push(vscode.commands.registerCommand('extension.convertPxToRpxInFolder', async (uri) => {
		const folderPath = uri.fsPath;
		convertFolder(folderPath, 1)
	}));


	context.subscriptions.push(vscode.commands.registerCommand('extension.convertRpxToPxInFolder', async (uri) => {
		const folderPath = uri.fsPath;
		convertFolder(folderPath, 2)
	}));
}

exports.activate = activate;