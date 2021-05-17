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
let proofJson: string;

const inputs = [
    {
        protocolId: "SHA256WithRSA" as ProtocolIdType,
    },
    {
        protocolId: "SHA256WithECDSA" as ProtocolIdType,
    },
];

inputs.forEach(function(input) {
    describe(`Testing proof methods with protocolId="${input.protocolId}"`, function() {
        this.timeout(60000);

        before('Initializing identity', () => {
            identityId = uuidv4();
            requestId = uuidv4();
            keyPair = platformUtils.generateKeypairWithProtocolId(input.protocolId, identityId);

            const request: ICreateIdentityRequest = {
                identityId,
                publicCredentials: {
                    key: keyPair.pubKeyBase64,
                    protocolId: input.protocolId,
                },
                requestId,
            };
            return platformClient.createIdentity(request, keyPair);

        });

        describe("Retrieve proof", function() {
            it("should return success", function() {
                return platformClient.getProof(requestId, keyPair)
                .then( (response) => {
                    proofJson = JSON.stringify(response)
                    expect(response.proof).exist;
                    expect(response.signatories).exist;
                    expect(response.parentFingerprints).exist;
                });

            });
        });

        describe("Validate proof", function() {
            it("should return success", function() {
                return platformUtils.validateProof(proofJson)
                .then( (response) => {
                    expect(response.signatories).exist;
                    expect(response.signatories.filter((signatory) => signatory.valid === false).length).to.equal(0)
                });

            });
        });

    });

});
