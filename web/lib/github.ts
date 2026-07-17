function getConfig() {
  const token = process.env.GITHUB_TOKEN || '';
  const owner = process.env.GITHUB_USER || '';
  const repo = process.env.GITHUB_REPO || '';
  return { token, owner, repo, configured: Boolean(token && owner && repo) };
}

export function isGithubConfigured() {
  return getConfig().configured;
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

export interface GithubJobStep {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface GithubJob {
  name: string;
  steps: GithubJobStep[];
}

export interface GithubRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

export async function getLatestRuns(perPage = 5): Promise<GithubRun[]> {
  const { token, owner, repo, configured } = getConfig();
  if (!configured) return [];
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=${perPage}`,
    { headers: headers(token), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`GitHub Runs Abruf fehlgeschlagen: ${res.status}`);
  const data = await res.json();
  return data.workflow_runs || [];
}

export async function getRunJobs(runId: number): Promise<GithubJob[]> {
  const { token, owner, repo, configured } = getConfig();
  if (!configured) return [];
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
    { headers: headers(token), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`GitHub Jobs Abruf fehlgeschlagen: ${res.status}`);
  const data = await res.json();
  return data.jobs || [];
}

export async function dispatchScrapeWorkflow(targetDate?: string): Promise<void> {
  const { token, owner, repo, configured } = getConfig();
  if (!configured) throw new Error('GitHub ist nicht konfiguriert (GITHUB_TOKEN/GITHUB_USER/GITHUB_REPO fehlen).');

  const payload: Record<string, unknown> = { ref: 'master' };
  if (targetDate) payload.inputs = { target_date: targetDate };

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/scrape_schedule.yml/dispatches`,
    { method: 'POST', headers: headers(token), body: JSON.stringify(payload) }
  );
  if (!res.ok) throw new Error(`Scrape-Workflow konnte nicht gestartet werden: ${res.status} ${await res.text()}`);
}

export async function dispatchDailyCheckWorkflow(): Promise<void> {
  const { token, owner, repo, configured } = getConfig();
  if (!configured) throw new Error('GitHub ist nicht konfiguriert (GITHUB_TOKEN/GITHUB_USER/GITHUB_REPO fehlen).');

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/daily_status_check.yml/dispatches`,
    { method: 'POST', headers: headers(token), body: JSON.stringify({ ref: 'master' }) }
  );
  if (!res.ok) throw new Error(`Daily-Check-Workflow konnte nicht gestartet werden: ${res.status} ${await res.text()}`);
}

export async function dispatchUploadWorkflow(reportId: string, content: unknown): Promise<void> {
  const { token, owner, repo, configured } = getConfig();
  if (!configured) throw new Error('GitHub ist nicht konfiguriert (GITHUB_TOKEN/GITHUB_USER/GITHUB_REPO fehlen).');

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      event_type: 'trigger-ihk-upload',
      client_payload: { text: JSON.stringify(content), reportId },
    }),
  });
  if (!res.ok) throw new Error(`Upload-Workflow konnte nicht gestartet werden: ${res.status} ${await res.text()}`);
}
