/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { API } from '../../spectron/client';
import { Editors } from '../editor/editors';
import { Commands } from '../workbench/workbench';

export class QuickOpen {

	static QUICK_OPEN_HIDDEN = 'div.monaco-quick-open-widget[aria-hidden="true"]';
	static QUICK_OPEN = 'div.monaco-quick-open-widget[aria-hidden="false"]';
	static QUICK_OPEN_INPUT = `${QuickOpen.QUICK_OPEN} .quick-open-input input`;
	static QUICK_OPEN_FOCUSED_ELEMENT = `${QuickOpen.QUICK_OPEN} .quick-open-tree .monaco-tree-row.focused .monaco-highlighted-label`;
	static QUICK_OPEN_ENTRY_SELECTOR = 'div[aria-label="Quick Picker"] .monaco-tree-rows.show-twisties .monaco-tree-row .quick-open-entry';
	static QUICK_OPEN_ENTRY_LABEL_SELECTOR = 'div[aria-label="Quick Picker"] .monaco-tree-rows.show-twisties .monaco-tree-row .quick-open-entry .label-name';

	constructor(private api: API, private commands: Commands, private editors: Editors) { }

	async openQuickOpen(value: string): Promise<void> {
		await this.commands.runCommand('workbench.action.quickOpen');
		await this.waitForQuickOpenOpened();

		if (value) {
			await this.api.setValue(QuickOpen.QUICK_OPEN_INPUT, value);
		}
	}

	async closeQuickOpen(): Promise<void> {
		await this.commands.runCommand('workbench.action.closeQuickOpen');
		await this.waitForQuickOpenClosed();
	}

	async openFile(fileName: string): Promise<void> {
		await this.openQuickOpen(fileName);

		await this.waitForQuickOpenElements(names => names.some(n => n === fileName));
		await this.api.keys(['Enter', 'NULL']);
		await this.editors.waitForActiveTab(fileName);
		await this.editors.waitForEditorFocus(fileName);
	}

	async waitForQuickOpenOpened(): Promise<void> {
		await this.api.waitForActiveElement(QuickOpen.QUICK_OPEN_INPUT);
	}

	private async waitForQuickOpenClosed(): Promise<void> {
		await this.api.waitForElement(QuickOpen.QUICK_OPEN_HIDDEN);
	}

	async submit(text: string): Promise<void> {
		await this.api.setValue(QuickOpen.QUICK_OPEN_INPUT, text);
		await this.api.keys(['Enter', 'NULL']);
		await this.waitForQuickOpenClosed();
	}

	async selectQuickOpenElement(index: number): Promise<void> {
		await this.waitForQuickOpenOpened();
		for (let from = 0; from < index; from++) {
			await this.api.keys(['ArrowDown', 'NULL']);
		}
		await this.api.keys(['Enter', 'NULL']);
		await this.waitForQuickOpenClosed();
	}

	async waitForQuickOpenElements(accept: (names: string[]) => boolean): Promise<void> {
		await this.api.waitForElements(QuickOpen.QUICK_OPEN_ENTRY_LABEL_SELECTOR, els => accept(els.map(e => e.textContent)));
	}

	async runCommand(command: string): Promise<void> {
		await this.openQuickOpen(`> ${command}`);

		// wait for best choice to be focused
		await this.api.waitForTextContent(QuickOpen.QUICK_OPEN_FOCUSED_ELEMENT, command);

		// wait and click on best choice
		await this.api.waitAndClick(QuickOpen.QUICK_OPEN_FOCUSED_ELEMENT);
	}

	async openQuickOutline(): Promise<void> {
		let retries = 0;

		while (++retries < 10) {
			await this.commands.runCommand('workbench.action.gotoSymbol');

			const text = await this.api.waitForText('div[aria-label="Quick Picker"] .monaco-tree-rows.show-twisties div.monaco-tree-row .quick-open-entry .monaco-icon-label .label-name .monaco-highlighted-label span');

			if (text !== 'No symbol information for the file') {
				return;
			}

			await this.closeQuickOpen();
			await new Promise(c => setTimeout(c, 250));
		}
	}
}
