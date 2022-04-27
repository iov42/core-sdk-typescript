import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IKeyPairData, PlatformUtils, ProtocolIdType } from "../iov42/core-sdk";

const platformUtils = new PlatformUtils();

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
    describe(`Testing create keypair method with protocolId="${input.protocolId}"`, function() {

        before('Initializing keypair', () => {
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, uuidv4());
        });

        describe("Test signature", function() {
            it("should return success", async function() {
                const payload = "This is a simple string"
                const signature = await platformUtils.signWithProtocolId(keyPair.protocolId, keyPair.prvKeyBase64, payload)
                const verify = await platformUtils.verifyWithProtocolId(keyPair.protocolId, keyPair.pubKeyBase64, payload, signature)
                expect(verify).to.equal(true)
            });
        });
    });

});
