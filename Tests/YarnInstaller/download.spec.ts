import { downloadFrom } from "../../Tasks/YarnInstaller/download";

describe("Yarn Installer", () => {
  describe("Donwloader", () => {
    it("Successfully downloads from Github", async () => {
      console.log("downloading from github");
      const response = await downloadFrom(
        "https://github.com/yarnpkg/yarn/releases/download/v1.17.0/yarn-v1.17.0.tar.gz",
        console.log
      );
      expect(response.statusCode).toBe(200);
    });
  });
});
