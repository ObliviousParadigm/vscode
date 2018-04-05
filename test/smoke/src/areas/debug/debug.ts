/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Viewlet } from '../workbench/viewlet';
import { Commands } from '../workbench/workbench';
import { API } from '../../spectron/client';
import { Editors } from '../editor/editors';
import { Editor } from '../editor/editor';

const VIEWLET = 'div[id="workbench.view.debug"]';
const DEBUG_VIEW = `${VIEWLET} .debug-view-content`;
const CONFIGURE = `div[id="workbench.parts.sidebar"] .actions-container .configure`;
const START = `.icon[title="Start Debugging"]`;
const STOP = `.debug-actions-widget .debug-action.stop`;
const STEP_OVER = `.debug-actions-widget .debug-action.step-over`;
const STEP_IN = `.debug-actions-widget .debug-action.step-into`;
const STEP_OUT = `.debug-actions-widget .debug-action.step-out`;
const CONTINUE = `.debug-actions-widget .debug-action.continue`;
const GLYPH_AREA = '.margin-view-overlays>:nth-child';
const BREAKPOINT_GLYPH = '.debug-breakpoint';
const PAUSE = `.debug-actions-widget .debug-action.pause`;
const DEBUG_STATUS_BAR = `.statusbar.debugging`;
const NOT_DEBUG_STATUS_BAR = `.statusbar:not(debugging)`;
const TOOLBAR_HIDDEN = `.debug-actions-widget.monaco-builder-hidden`;
const STACK_FRAME = `${VIEWLET} .monaco-tree-row .stack-frame`;
const SPECIFIC_STACK_FRAME = filename => `${STACK_FRAME} .file[title$="${filename}"]`;
const VARIABLE = `${VIEWLET} .debug-variables .monaco-tree-row .expression`;
const CONSOLE_OUTPUT = `.repl .output.expression`;
const CONSOLE_INPUT_OUTPUT = `.repl .input-output-pair .output.expression .value`;

const REPL_FOCUSED = '.repl-input-wrapper .monaco-editor textarea';

export interface IStackFrame {
	name: string;
	lineNumber: number;
}

export class Debug extends Viewlet {

	constructor(api: API, private commands: Commands, private editors: Editors, private editor: Editor) {
		super(api);
	}

	async openDebugViewlet(): Promise<any> {
		await this.commands.runCommand('workbench.view.debug');
		await this.api.waitForElement(DEBUG_VIEW);
	}

	async configure(): Promise<any> {
		await this.api.waitAndClick(CONFIGURE);
		await this.editors.waitForEditorFocus('launch.json');
	}

	async setBreakpointOnLine(lineNumber: number): Promise<any> {
		await this.api.waitForElement(`${GLYPH_AREA}(${lineNumber})`);
		await this.api.waitAndClick(`${GLYPH_AREA}(${lineNumber})`, 5, 5);
		await this.api.waitForElement(BREAKPOINT_GLYPH);
	}

	async startDebugging(): Promise<number> {
		await this.api.waitAndClick(START);
		await this.api.waitForElement(PAUSE);
		await this.api.waitForElement(DEBUG_STATUS_BAR);
		const portPrefix = 'Port: ';
		await this.api.waitFor(async () => {
			const output = await this.getConsoleOutput();
			return output.join('');
		}, text => !!text && text.indexOf(portPrefix) >= 0);
		const output = await this.getConsoleOutput();
		const lastOutput = output.pop();

		return lastOutput ? parseInt(lastOutput.substr(portPrefix.length)) : 3000;
	}

	async stepOver(): Promise<any> {
		await this.api.waitAndClick(STEP_OVER);
	}

	async stepIn(): Promise<any> {
		await this.api.waitAndClick(STEP_IN);
	}

	async stepOut(): Promise<any> {
		await this.api.waitAndClick(STEP_OUT);
	}

	async continue(): Promise<any> {
		await this.api.waitAndClick(CONTINUE);
		await this.waitForStackFrameLength(0);
	}

	async stopDebugging(): Promise<any> {
		await this.api.waitAndClick(STOP);
		await this.api.waitForElement(TOOLBAR_HIDDEN);
		await this.api.waitForElement(NOT_DEBUG_STATUS_BAR);
	}

	async waitForStackFrame(func: (stackFrame: IStackFrame) => boolean, message: string): Promise<IStackFrame> {
		return await this.api.waitFor(async () => {
			const stackFrames = await this.getStackFrames();
			return stackFrames.filter(func)[0];
		}, void 0, `Waiting for Stack Frame: ${message}`);
	}

	async waitForStackFrameLength(length: number): Promise<any> {
		await this.api.waitForElements(STACK_FRAME, result => result.length === length);
	}

	async focusStackFrame(name: string, message: string): Promise<any> {
		await this.api.waitAndClick(SPECIFIC_STACK_FRAME(name));
		await this.editors.waitForTab(name);
	}

	async waitForReplCommand(text: string, accept: (result: string) => boolean): Promise<void> {
		await this.commands.runCommand('Debug: Focus Debug Console');
		await this.api.waitForActiveElement(REPL_FOCUSED);
		await this.api.setValue(REPL_FOCUSED, text);

		// Wait for the keys to be picked up by the editor model such that repl evalutes what just got typed
		await this.editor.waitForEditorContents('debug:input', s => s.indexOf(text) >= 0);
		await this.api.keys(['Enter', 'NULL']);
		await this.api.waitForElement(CONSOLE_INPUT_OUTPUT);
		await this.api.waitFor(async () => {
			const result = await this.getConsoleOutput();
			return result[result.length - 1] || '';
		}, accept);
	}

	async getLocalVariableCount(): Promise<number> {
		return await this.api.getElementCount(VARIABLE);
	}

	private async getStackFrames(): Promise<IStackFrame[]> {
		const result = await this.api.selectorExecute(STACK_FRAME,
			div => (Array.isArray(div) ? div : [div]).map(element => {
				const name = element.querySelector('.file-name') as HTMLElement;
				const line = element.querySelector('.line-number') as HTMLElement;
				const lineNumber = line.textContent ? parseInt(line.textContent.split(':').shift() || '0') : 0;

				return {
					name: name.textContent || '',
					lineNumber
				};
			})
		);

		if (!Array.isArray(result)) {
			return [];
		}

		return result.map(({ name, lineNumber }) => ({ name, lineNumber }));
	}

	private async getConsoleOutput(): Promise<string[]> {
		const result = await this.api.selectorExecute(CONSOLE_OUTPUT,
			div => (Array.isArray(div) ? div : [div]).map(element => {
				const value = element.querySelector('.value') as HTMLElement;
				return value && value.textContent;
			}).filter(line => !!line) as string[]
		);

		return result;
	}
}
