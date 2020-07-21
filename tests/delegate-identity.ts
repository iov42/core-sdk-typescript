import { expect } from "chai";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IKeyPairData, PlatformClient, PlatformUtils, ProtocolIdType, IAuthorisedRequest, IAddDelegateRequest, ICreateIdentityRequest } from "../iov42/core-sdk";

const rpcUrl = "https://api.vienna-integration.poc.iov42.net";
const platformClient = new PlatformClient(rpcUrl);
const platformUtils = new PlatformUtils();

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

    describe(`Testing identity methods using delegate with protocolId="${input.protocolId}"`, function() {
        this.timeout(60000);

        before('Initializing identities', function() {
            identityId = uuidv4();
            delegateIdentityId = uuidv4();
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);
            delegateKeyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, delegateIdentityId);
    
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

        describe("Add new delegate", function() {
            it("should return success", function() {
                const request: IAddDelegateRequest = {
                    _type: "AddDelegateRequest",
                    delegateIdentityId,
                    delegatorIdentityId: identityId,
                    requestId: uuidv4(),
                };
                const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(request, keyPair);
                const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
                    signedRequest,
                    delegateKeyPair
                );

                return platformClient.addDelegate(finalRequest, keyPair)
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

        describe("Retrieve identity using delegate", function() {
            it("should return success", function() {
                return platformClient.getIdentity(identityId, delegateKeyPair, identityId)
                .then( (response) => {
                    expect(response.identityId).to.equal(identityId);
                    expect(response.publicCredentials[0].key).to.equal(keyPair.pubKeyBase64);
                    expect(response.publicCredentials[0].protocolId).to.equal(input.protocolId);
                });
            });
        });

    });

});
