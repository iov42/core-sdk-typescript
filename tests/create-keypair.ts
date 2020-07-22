import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IKeyPairData, PlatformClient } from "../iov42/core-sdk";

const rpcUrl = "https://api.sandbox.iov42.dev";
const platformClient = new PlatformClient(rpcUrl);

let identityId: string;
let requestId: string;
let keyPair: IKeyPairData;

const inputs = [
    {
        protocolId: "SHA256WithRSA",
    },
    {
        protocolId: "SHA256WithECDSA",
    },
];

inputs.forEach(function(input) {
    describe(`Testing create keypair method with protocolId=${input.protocolId}`, function() {
        this.timeout(10000);

        describe("Create new key pair", function() {
            it("should return success", async function() {
                await platformClient.ready;
                keyPair = platformClient.generateKeypairWithProtocolId(input.protocolId);
                    expect(keyPair.protocolId).to.equal(input.protocolId);
                    expect(keyPair.pubKeyBase64).to.exist;
                    expect(keyPair.prvKeyBase64).to.exist;
            });
        });
    });

});
