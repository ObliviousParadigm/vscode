/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Viewlet } from '../workbench/viewlet';
import { API } from '../../spectron/client';
import { Commands } from '../workbench/workbench';

const VIEWLET = 'div[id="workbench.view.search"] .search-view';
const INPUT = `${VIEWLET} .search-widget .search-container .monaco-inputbox input`;
const INCLUDE_INPUT = `${VIEWLET} .query-details .monaco-inputbox input[aria-label="Search Include/Exclude Patterns"]`;

export class Search extends Viewlet {

	constructor(api: API, private commands: Commands) {
		super(api);
	}

	async openSearchViewlet(): Promise<any> {
		await this.commands.runCommand('workbench.view.search');
		await this.api.waitForActiveElement(INPUT);
	}

	async searchFor(text: string): Promise<void> {
		await this.api.waitAndClick(INPUT);
		await this.api.waitForActiveElement(INPUT);
		await this.api.setValue(INPUT, text);
		await this.submitSearch();
	}

	async submitSearch(): Promise<void> {
		await this.api.waitAndClick(INPUT);
		await this.api.waitForActiveElement(INPUT);

		await this.api.keys(['Enter', 'NULL']);
		await this.api.waitForElement(`${VIEWLET} .messages[aria-hidden="false"]`);
	}

	async setFilesToIncludeText(text: string): Promise<void> {
		await this.api.waitAndClick(INCLUDE_INPUT);
		await this.api.waitForActiveElement(INCLUDE_INPUT);
		await this.api.setValue(INCLUDE_INPUT, text || '');
	}

	async showQueryDetails(): Promise<void> {
		if (!await this.areDetailsVisible()) {
			await this.api.waitAndClick(`${VIEWLET} .query-details .more`);
		}
	}

	async hideQueryDetails(): Promise<void> {
		if (await this.areDetailsVisible()) {
			await this.api.waitAndClick(`${VIEWLET} .query-details.more .more`);
		}
	}

	areDetailsVisible(): Promise<boolean> {
		return this.api.doesElementExist(`${VIEWLET} .query-details.more`);
	}

	async removeFileMatch(index: number): Promise<void> {
		await this.api.waitAndMoveToObject(`${VIEWLET} .results .monaco-tree-rows>:nth-child(${index}) .filematch`);
		const file = await this.api.waitForText(`${VIEWLET} .results .monaco-tree-rows>:nth-child(${index}) .filematch a.label-name`);
		await this.api.waitAndClick(`${VIEWLET} .results .monaco-tree-rows>:nth-child(${index}) .filematch .action-label.icon.action-remove`);
		await this.api.waitForText(`${VIEWLET} .results .monaco-tree-rows>:nth-child(${index}) .filematch a.label-name`, void 0, result => result !== file);
	}

	async expandReplace(): Promise<void> {
		await this.api.waitAndClick(`${VIEWLET} .search-widget .monaco-button.toggle-replace-button.collapse`);
	}

	async setReplaceText(text: string): Promise<void> {
		await this.api.waitAndClick(`${VIEWLET} .search-widget .replace-container .monaco-inputbox input[title="Replace"]`);
		await this.api.waitForElement(`${VIEWLET} .search-widget .replace-container .monaco-inputbox.synthetic-focus input[title="Replace"]`);
		await this.api.setValue(`${VIEWLET} .search-widget .replace-container .monaco-inputbox.synthetic-focus input[title="Replace"]`, text);
	}

	async replaceFileMatch(index: number): Promise<void> {
		await this.api.waitAndMoveToObject(`${VIEWLET} .results .monaco-tree-rows>:nth-child(${index}) .filematch`);
		await this.api.waitAndClick(`${VIEWLET} .results .monaco-tree-rows>:nth-child(${index}) .filematch .action-label.icon.action-replace-all`);
	}

	async waitForResultText(text: string): Promise<void> {
		await this.api.waitForText(`${VIEWLET} .messages[aria-hidden="false"] .message>p`, text);
	}
}
