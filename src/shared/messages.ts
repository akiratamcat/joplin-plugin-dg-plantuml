// SPDX-License-Identifier: MIT
// Messages between the viewer script and the main script (design 4.1, 7.2, 11).

/** ID of the Markdown-it content script. The viewer posts its messages to it. */
export const MARKDOWN_IT_SCRIPT_ID = 'dgPlantumlMarkdownIt';

export interface GetConfigMessage {
	type: 'getConfig';
}

/** Copy text (SVG markup or PlantUML source) to the clipboard. */
export interface CopyTextMessage {
	type: 'copyText';
	text: string;
	/** What was copied, for the confirmation message. */
	what: 'svg' | 'source';
}

/** Copy an image (PNG data URL) to the clipboard. */
export interface CopyImageMessage {
	type: 'copyImage';
	dataUrl: string;
}

/** Save an image to a file in a folder the user chooses. */
export interface SaveFileMessage {
	type: 'saveFile';
	kind: 'svg' | 'png';
	/** SVG markup, or a PNG data URL. */
	data: string;
	/** 1-based position of the diagram in the note, used in the file name. */
	index: number;
}

/** Open a link of a diagram (":/noteId" or an external URL), as Joplin does for note links. */
export interface OpenLinkMessage {
	type: 'openLink';
	href: string;
}

export type ViewerMessage = GetConfigMessage | CopyTextMessage | CopyImageMessage | SaveFileMessage | OpenLinkMessage;

/** Answer to the action messages. */
export interface ActionResult {
	ok: boolean;
	/** The user closed the folder dialog without choosing. */
	cancelled?: boolean;
	/** Saved file. */
	path?: string;
	error?: string;
}
