import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IKeyPairData, PlatformClient, ProtocolIdType, IAuthorisedRequest, IAddDelegateRequest, ICreateIdentityRequest } from "../iov42/core-sdk";

const rpcUrl = "https://api.sandbox.iov42.dev";
const platformClient = new PlatformClient(rpcUrl);

let identityId: string;
let delegateIdentityId: string;
let keyPair: IKeyPairData;
let delegateKeyPair: IKeyPairData;

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];

inputs.forEach(function(input) {

    describe(`Testing delegate methods with protocolId=${input.protocolId}`, function() {
        this.timeout(20000);

        before('Initializing identities', function() {
            identityId = uuidv4();
            delegateIdentityId = uuidv4();
            keyPair = platformClient.generateKeypairWithProtocolId(input.protocolId);
            delegateKeyPair = platformClient.generateKeypairWithProtocolId(input.protocolId);
    
            const request1: ICreateIdentityRequest = {
                identityId,
                publicCredentials : {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
            };
            return platformClient.createIdentity(request1, keyPair)
            .then( () => {
                const request2: ICreateIdentityRequest = {
                    identityId: delegateIdentityId,
                    publicCredentials : {
                        key: delegateKeyPair.pubKeyBase64,
                        protocolId: input.protocolId,
                    },
                };
                return platformClient.createIdentity(request2, delegateKeyPair);
            });
        });

        describe("Create new delegate", function() {
            it("should return success", function() {
                const request: IAddDelegateRequest = {
                    delegateIdentityId,
                    requestId: uuidv4(),
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(identityId, request, keyPair);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    delegateIdentityId,
                    signedRequest,
                    delegateKeyPair
                );

                return platformClient.addDelegate(identityId, finalRequest, keyPair)
                .then( (response) => {
                    expect(response.requestId).to.equal(request.requestId);
                    expect(response.resources.length).to.equal(1);
                    expect(response.resources[0]).to.equal(`/api/v1/identities/${identityId}`);
                    expect(response.proof).to.equal(`/api/v1/proofs/${request.requestId}`);
                });
            });
        });

        describe("Retrieve identity's delegates", function() {
            it("should return success", function() {
                return platformClient.getDelegates(identityId, keyPair)
                .then( (response) => {
                    expect(response.delegates.length).to.equal(1);
                    expect(response.delegates[0].delegateIdentityId).to.equal(delegateIdentityId);
                    expect(response.delegates[0].delegateIdentityId).to.exist;
                });
            });
        });
    });

});
