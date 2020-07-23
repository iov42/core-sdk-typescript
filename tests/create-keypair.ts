import { expect } from "chai";
import "mocha";
import { IKeyPairData, PlatformClient, ProtocolIdType } from "../iov42/core-sdk";

const rpcUrl = "https://api.sandbox.iov42.dev";
const platformClient = new PlatformClient(rpcUrl);

let keyPair: IKeyPairData;

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];

inputs.forEach(function(input) {
    describe(`Testing create keypair method with protocolId=${input.protocolId}`, function() {
        this.timeout(10000);

        describe("Create new key pair", function() {
            it("should return success", function() {
                keyPair = platformClient.generateKeypairWithProtocolId(input.protocolId);
                    expect(keyPair.protocolId).to.equal(input.protocolId);
                    expect(keyPair.pubKeyBase64).to.exist;
                    expect(keyPair.prvKeyBase64).to.exist;
            });
        });
    });

});
