import { Octokit } from "octokit";
import url from "url";

import { GITHUB_PAT } from "@config";

const octokit = new Octokit({
  auth: GITHUB_PAT,
});

function getUserAndRepoFromUrl(githubUrl) {
  const parsedUrl = url.parse(githubUrl);
  if (parsedUrl.host !== "github.com") {
    throw new Error("The URL is not a GitHub URL");
  }

  const pathParts = parsedUrl.pathname
    .split("/")
    .filter((part) => part.length > 0);
  if (pathParts.length < 2) {
    throw new Error("The URL does not contain a username and repository name");
  }

  return {
    user: pathParts[0],
    repo: pathParts[1],
  };
}

async function getAllPdfs(owner, repo) {
  const {
    data: { default_branch },
  } = await octokit.rest.repos.get({ owner, repo });

  const {
    data: {
      commit: {
        tree: { sha: treeSha },
      },
    },
  } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: default_branch,
  });

  const {
    data: { tree },
  } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "1",
  });

  const pdfFiles = tree.filter((file) => file.path.endsWith(".pdf"));

  return pdfFiles.map((file) => ({
    name: file.path,
    url: encodeURI(
      `https://raw.githubusercontent.com/${owner}/${repo}/${default_branch}/${file.path}`
    ),
  }));
}

const getPdfsFromRepo = async (githubUrl) => {
  const { user, repo } = getUserAndRepoFromUrl(githubUrl);
  return getAllPdfs(user, repo);
};

export { getPdfsFromRepo };
