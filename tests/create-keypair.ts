import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IKeyPairData, PlatformUtils, ProtocolIdType } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
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
        this.timeout(60000);

        describe("Create new key pair", function() {
            it("should return success", function() {
                keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, uuidv4());
                    expect(keyPair.protocolId).to.equal(input.protocolId);
                    expect(keyPair.pubKeyBase64).to.exist;
                    expect(keyPair.prvKeyBase64).to.exist;
            });
        });
    });

});
