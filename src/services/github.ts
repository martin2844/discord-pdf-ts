import { Octokit } from "octokit";
import url from "url";

import { GITHUB_PAT } from "@config";
import { GithubUserName, Uploader } from "@ctypes/uploaders";

const octokit = new Octokit({
  auth: GITHUB_PAT,
});

function getUserAndRepoFromUrl(githubUrl: string) {
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

async function getAllPdfs(owner: GithubUserName, repo: string) {
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
    date: new Date().toISOString(),
    file: encodeURI(
      `https://raw.githubusercontent.com/${owner}/${repo}/${default_branch}/${file.path}`
    ),
  }));
}

const getPdfsFromRepo = async (githubUrl: string) => {
  const { user, repo } = getUserAndRepoFromUrl(githubUrl);
  return getAllPdfs(user, repo);
};

async function getDetailsFromUser(user: GithubUserName): Promise<Uploader> {
  const {
    data: { name, avatar_url },
  } = await octokit.rest.users.getByUsername({
    username: user,
  });

  return {
    name,
    avatar: avatar_url,
    uploader_id: user,
    source: "github",
  };
}

export { getPdfsFromRepo, getUserAndRepoFromUrl, getDetailsFromUser };
