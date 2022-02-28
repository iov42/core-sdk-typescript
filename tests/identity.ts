import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { ICreateIdentityRequest, IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType } from "../iov42/core-sdk";

const rpcUrl: string = process.env.ENDPOINT_URL!;
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

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
    describe(`Testing identity methods with protocolId="${input.protocolId}"`, function() {
        this.timeout(60000);

        describe("Issue new identity", function() {
            it("should return success", function() {
                requestId = uuidv4();
                identityId = uuidv4();
                keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);
                const request: ICreateIdentityRequest = {
                    identityId,
                    publicCredentials : {
                        key: keyPair.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                    requestId,
                };
                return platformClient.createIdentity(request, keyPair)
                .then( (response) => {
                    expect(response.requestId).to.equal(requestId);
                    expect(response.resources[0]).to.equal(`/api/v1/identities/${identityId}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
                });
            });
        });

        describe("Create new identity", function() {
            it("should return success", function() {
                const createRequestId = uuidv4();
                const createIdentityId = uuidv4();
                const createKeyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, createIdentityId);
                const request: ICreateIdentityRequest = {
                    identityId: createIdentityId,
                    publicCredentials : {
                        key: createKeyPair.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                    requestId: createRequestId,
                    _type: "CreateIdentityRequest",
                };
                return platformClient.createIdentity(request, keyPair)
                .then( (response) => {
                    expect(response.requestId).to.equal(createRequestId);
                    expect(response.resources[0]).to.equal(`/api/v1/identities/${createIdentityId}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${createRequestId}`);
                });
            });
        });

        describe("Retrieve created identity", function() {
            it("should return success", function() {
                return platformClient.getIdentity(identityId, keyPair)
                .then( (response) => {
                    expect(response.identityId).to.equal(identityId);
                    expect(response.publicCredentials[0].key).to.equal(keyPair.pubKeyBase64);
                    expect(response.publicCredentials[0].protocolId).to.equal(input.protocolId);
                    //expect(response.proof).to.equal(`/api/v1/proofs/${requestId}`);
                });
            });
        });

        describe("Retrieve created identity's public key", function() {
            it("should return success", function() {
                return platformClient.getPublicKey(identityId, keyPair)
                .then( (response) => {
                    expect(response.key).to.equal(keyPair.pubKeyBase64);
                    expect(response.protocolId).to.equal(input.protocolId);
                });
            });
        });

    });

});
