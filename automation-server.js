import express from "express";
import crypto from "crypto";
import process from "process";
import { Octokit } from "octokit";

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!WEBHOOK_SECRET) console.warn("WEBHOOK_SECRET not set");
if (!GITHUB_TOKEN) console.warn("GITHUB_TOKEN not set");

const octokit = new Octokit({ auth: GITHUB_TOKEN });

function verifySignature(req) {
  const sig = req.headers["x-hub-signature-256"];
  if (!sig || !WEBHOOK_SECRET) return false;
  const body = JSON.stringify(req.body);
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(body).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest));
  } catch (e) {
    return false;
  }
}

async function alreadyAcknowledged(owner, repo, issue_number, marker = "<!-- ciam-ack -->") {
  try {
    const { data } = await octokit.rest.issues.listComments({ owner, repo, issue_number });
    return data.some((c) => c.body && c.body.includes(marker));
  } catch (e) {
    console.warn("Could not check comments:", e.message);
    return false;
  }
}

app.post("/webhook", async (req, res) => {
  if (!verifySignature(req)) {
    console.warn("Invalid signature");
    return res.status(401).send("Invalid signature");
  }

  const event = req.headers["x-github-event"];
  if (event === "issues" && req.body.action === "opened") {
    const owner = req.body.repository.owner.login;
    const repo = req.body.repository.name;
    const number = req.body.issue.number;
    const author = req.body.issue.user.login;
    const marker = "<!-- ciam-ack -->";
    try {
      if (!(await alreadyAcknowledged(owner, repo, number, marker))) {
        const body = [
          `Hi @${author}, thank you for contacting the CIAM team!`,
          "",
          `We have received your issue and are currently taking a look. A team member will follow up as soon as possible.`,
          "",
          marker,
        ].join("\n");
        await octokit.rest.issues.createComment({ owner, repo, issue_number: number, body });
        console.log(`Posted ack for ${owner}/${repo}#${number}`);
      } else {
        console.log(`Already acknowledged ${owner}/${repo}#${number}`);
      }
    } catch (err) {
      console.error("Failed to create comment", err);
    }
  }

  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
