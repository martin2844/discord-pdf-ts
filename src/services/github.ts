import { Octokit } from "octokit";
import url from "url";

import { GITHUB_PAT } from "@config";
import { GithubUserName, Uploader } from "@ctypes/uploaders";

const octokit = new Octokit({
  auth: GITHUB_PAT,
});

/**
 * Extracts the username and repository name from a GitHub URL.
 * @param {string} githubUrl - The GitHub URL to parse.
 * @returns {{ user: string, repo: string }} - An object containing the username and repository name.
 * @throws {Error} - If the URL is not a valid GitHub URL or does not contain a username and repository name.
 */
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

/**
 * Retrieves all PDF files from a GitHub repository.
 * @param {string} owner - The username or organization name that owns the repository.
 * @param {string} repo - The name of the repository.
 * @returns {Promise<BookMessage[]>} - A promise that resolves to an array of BookMessage objects representing the retrieved PDF files.
 */
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

/**
 * Retrieves PDF files from a GitHub repository using the provided GitHub URL.
 * @param {string} githubUrl - The GitHub URL of the repository.
 * @returns {Promise<BookMessage[]>} - A promise that resolves to an array of BookMessage objects representing the retrieved PDF files.
 */
const getPdfsFromRepo = async (githubUrl: string) => {
  const { user, repo } = getUserAndRepoFromUrl(githubUrl);
  return getAllPdfs(user, repo);
};

/**
 * Retrieves details of a GitHub user.
 * @param {GithubUserName} user - The username of the GitHub user.
 * @returns {Promise<Uploader>} - A promise that resolves to an Uploader object representing the user details.
 */
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
