import { expect } from "chai";
import "mocha";
import { PlatformClient } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);

describe("Retrieve node's health information", function() {
    it("should return success", function() {
        return platformClient.getHealthChecks()
        .then( (response) => {
            expect(response.buildInfo).to.exist;
            expect(response.buildInfo.name).to.equal("consumers-monitor");
            expect(response.buildInfo.version).to.exist;
            expect(response.buildInfo.scalaVersion).to.exist;
            expect(response.buildInfo.sbtVersion).to.exist;
            expect(response.broker).to.exist;
            expect(response.broker.canWrite).to.equal(true);
            expect(response.requestStore).to.exist;
            expect(response.requestStore.canRead).to.equal(true);
            expect(response.requestStore.canWrite).to.equal(true);
            expect(response.assetStore).to.exist;
            expect(response.assetStore.canRead).to.equal(true);
            expect(response.assetStore.canWrite).to.equal(true);
            expect(response.claimStore).to.exist;
            expect(response.claimStore.canRead).to.equal(true);
            expect(response.claimStore.canWrite).to.equal(true);
            expect(response.endorsementStore).to.exist;
            expect(response.endorsementStore.canRead).to.equal(true);
            expect(response.endorsementStore.canWrite).to.equal(true);
            expect(response.proofStore).to.exist;
            expect(response.proofStore.canRead).to.equal(true);
            expect(response.proofStore.canWrite).to.equal(true);
            expect(response.hsm).to.exist;
            expect(response.hsm.hasKeys).to.equal(true);
        });
    });
});

