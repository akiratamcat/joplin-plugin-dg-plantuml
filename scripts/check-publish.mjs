// SPDX-License-Identifier: MIT
// npm run check:publish [branch]  (docs/release.md "Before pushing to GitHub")
// Checks a branch (default: main) and its whole history before it is pushed
// to the public repository:
//   1. author / committer emails are only the allowed ones,
//   2. no file that must not be published is tracked (.env, logs, editor
//      files, build output, node_modules...). In the latest version it is an
//      error; a file found only in older commits is shown as a warning, so
//      that its content can be checked,
//   3. no file content looks like a secret (tokens, private keys) or a local
//      path of the PC (C:\Users\..., /home/...).
// Exits with 1 when a problem is found.
import { execFileSync } from 'node:child_process';

const branch = process.argv[2] || 'main';
// A full ref name avoids clashes with folder names (spike/engine is also a folder).
const ref = branch.startsWith('refs/') ? branch : `refs/heads/${branch}`;
/** Emails that may appear as author or committer (the owner chose the gmail address, 2026-11-19). */
const ALLOWED_EMAILS = ['akiratamcat@gmail.com', 'noreply@anthropic.com'];

const FORBIDDEN_FILES = [
	/(^|\/)\.env(\.|$)/, /\.log$/, /\.tgz$/, /\.code-workspace$/, /(^|\/)\.vscode\//, /(^|\/)\.idea\//,
	/(^|\/)\.claude\/settings\.local\.json$/, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/,
	/^dist\//, /^publish\//, /(^|\/)node_modules\//, /^coverage\//, /^src\/i18n\/catalog\//, /^spike\//,
	/\.(pem|key|p12|pfx)$/, /(^|\/)id_(rsa|ed25519)/,
];

const SECRET_PATTERNS = [
	['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/],
	['npm token', /\bnpm_[A-Za-z0-9]{30,}/],
	['AWS key', /\bAKIA[0-9A-Z]{16}\b/],
	['Slack token', /\bxox[abpr]-[A-Za-z0-9-]{10,}/],
	['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
	['password or secret', /\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"'\s]{8,}["']/i],
	['local path', /[A-Za-z]:\\Users\\|[A-Za-z]:\/Users\/|\/home\/[a-z]|\/Users\/[A-Za-z][^/\s]*\/(Desktop|Documents|Library)/],
];
/** Files whose content is not scanned (bundled third-party code, lock files, saved engine output). */
const SKIP_CONTENT = [/^vendor\//, /package-lock\.json$/, /^tests\/fixtures\//];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 });
const problems = [];
const warnings = [];

// 1. Emails in the history of the branch.
const emails = new Set(git('log', ref, '--format=%ae%n%ce', '--').split('\n').filter(Boolean));
for (const email of emails) if (!ALLOWED_EMAILS.includes(email)) problems.push(`email in commits: ${email}`);
const coauthors = new Set((git('log', ref, '--format=%b', '--').match(/^Co-Authored-By:.*$/gim) || []).map((l) => l.trim()));
console.log(`authors/committers: ${[...emails].join(', ')}`);
console.log(`co-authors: ${[...coauthors].join(' | ') || 'none'}`);

// 2. File names in the history and in the latest version.
const commits = git('rev-list', ref, '--').split('\n').filter(Boolean);
const files = new Set(git('log', ref, '--format=', '--name-only', '--').split('\n').filter(Boolean));
const current = new Set(git('ls-tree', '-r', '--name-only', ref).split('\n').filter(Boolean));
for (const file of files) {
	if (!FORBIDDEN_FILES.some((re) => re.test(file))) continue;
	if (current.has(file)) problems.push(`file that must not be published: ${file}`);
	else warnings.push(`only in older commits (check that it holds nothing private): ${file}`);
}

// 3. Content of every version of every file.
const seenBlobs = new Set();
for (const commit of commits) {
	for (const line of git('ls-tree', '-r', commit).split('\n').filter(Boolean)) {
		const [meta, file] = line.split('\t');
		const blob = meta.split(' ')[2];
		if (seenBlobs.has(blob) || SKIP_CONTENT.some((re) => re.test(file))) continue;
		seenBlobs.add(blob);
		const text = git('cat-file', '-p', blob);
		if (text.includes('\u0000')) continue; // binary
		for (const [name, re] of SECRET_PATTERNS) {
			const m = re.exec(text);
			if (m) problems.push(`${name} in ${file} (commit ${commit.slice(0, 7)}): ${m[0].slice(0, 40)}`);
		}
	}
}

console.log(`checked ${commits.length} commits, ${files.size} file names, ${seenBlobs.size} file versions on ${branch}`);
for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length) {
	for (const p of [...new Set(problems)]) console.error(`problem: ${p}`);
	process.exit(1);
}
console.log('check:publish: OK');
