import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IKeyPairData, PlatformClient, ProtocolIdType } from "../iov42/core-sdk";

const rpcUrl = "https://api.sandbox.iov42.dev";
const platformClient = new PlatformClient(rpcUrl);

let identityId: string;
let requestId: string;
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
    describe(`Testing identity methods with protocolId=${input.protocolId}`, function() {
        this.timeout(10000);

        describe("Create new identity", function() {
            it("should return success", async function() {
                await platformClient.ready;
                requestId = uuidv4();
                identityId = uuidv4();
                keyPair = platformClient.generateKeypairWithProtocolId(input.protocolId);
                const request = {
                    identityId,
                    publicCredentials : {
                        key: keyPair.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                    requestId,
                };
                return platformClient.createIdentity(request, keyPair )
                .then( (response) => {
                    expect(response.requestId).to.equal(requestId);
                    expect(response.resources[0]).to.equal(`/api/v1/identities/${identityId}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
                });
            });
        });

        describe("Retrieve created identity", function() {
            it("should return success", async function() {
                await platformClient.ready;
                return platformClient.getIdentity(identityId, keyPair )
                .then( (response) => {
                    expect(response.identityId).to.equal(identityId);
                    expect(response.publicCredentials[0].key).to.equal(keyPair.pubKeyBase64);
                    expect(response.publicCredentials[0].protocolId).to.equal(input.protocolId);
                    expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
                });
            });
        });
    });

});
