import { exec } from 'node:child_process';

export function execGit(args: string[], repoPath: string): Promise<string> {
  const cmd = `git ${args.join(' ')}`;
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`git ${args[0]} failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}
