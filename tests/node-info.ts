import { expect } from "chai";
import "mocha";
import { PlatformClient } from "../iov42/core-sdk";

const rpcUrl = "https://api.vienna-integration.poc.iov42.net";
const platformClient = new PlatformClient(rpcUrl);

describe("Retrieve node information", function() {
    it("should return success", function() {
        return platformClient.getNodeInfo()
        .then( (response) => {
            expect(response.nodeId).to.equal("node1");
            expect(response.publicCredentials.protocolId).to.equal("SHA256WithECDSA");
        });
    });
});

