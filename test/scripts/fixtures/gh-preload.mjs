// This preload intercepts every subprocess request made by the deploy wrapper.
// Commands are reported to the parent test, never executed.
Bun.spawn = (cmd) => {
  if (cmd[0] !== "gh") throw new Error("Unexpected command: " + cmd[0]);
  console.error("DEPLOY_TEST_GH " + JSON.stringify(cmd));
  let output;
  if (cmd[1] === "workflow" && cmd[2] === "run") output = "stub dispatch";
  else if (cmd[1] === "run" && cmd[2] === "list") {
    output = JSON.stringify([{ databaseId: 123, status: "completed", conclusion: "success" }]);
  } else if (cmd[1] === "run" && cmd[2] === "view") {
    output = JSON.stringify({ status: "completed", conclusion: process.env.DEPLOY_TEST_CONCLUSION });
  } else throw new Error("Unexpected gh command: " + JSON.stringify(cmd));
  return {
    stdout: new Blob([output]).stream(),
    stderr: new Blob([]).stream(),
    exited: Promise.resolve(0),
  };
};
Bun.sleep = () => Promise.resolve();
