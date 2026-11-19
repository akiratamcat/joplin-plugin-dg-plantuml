// SPDX-License-Identifier: MIT
// Messages between the viewer script and the main script (design 4.1, 7.2).

/** ID of the Markdown-it content script. The viewer posts its messages to it. */
export const MARKDOWN_IT_SCRIPT_ID = 'dgPlantumlMarkdownIt';

export interface GetConfigMessage {
	type: 'getConfig';
}

export type ViewerMessage = GetConfigMessage;
