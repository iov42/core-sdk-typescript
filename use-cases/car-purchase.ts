import { v4 as uuidv4 } from "uuid";
import {
    IAuthorisedRequest,
    ICreateAssetRequest,
    ICreateAssetTypeRequest,
    ICreateClaimsRequest,
    ICreateIdentityRequest,
    IEndorseClaimsRequest,
    IKeyPairData,
    ITransferOwnership,
    ITransferRequest,
    PlatformClient,
    PlatformUtils } from "../iov42/core-sdk";

function carPurchase() {
    const rpcUrl: string = process.env.ENDPOINT_URL!;
    const platformClient = new PlatformClient(rpcUrl);
    const platformUtils = new PlatformUtils();
    const protocolId = "SHA256WithECDSA";
    let carAssetTypeId: string;
    let aliceKeyPair: IKeyPairData;
    let bobKeyPair: IKeyPairData;
    let aliceCarAssetId: string;
    let claims: string[];

    // 0. create an Identity for Motor Vehicle Authority (MVA)
    // MVA is a imaginary state authority for motor vehicles
    const mvaKeyPair: IKeyPairData = platformUtils.generateKeypairWithProtocolId(protocolId);
    const mvaIdentityRequest: ICreateIdentityRequest = {
        identityId: mvaKeyPair.identityId,
        publicCredentials : {
            key: mvaKeyPair.pubKeyBase64,
            protocolId,
        },
    };
    return platformClient.createIdentity(mvaIdentityRequest, mvaKeyPair)
    .then(() => {
        // 1. MVA creates an AssetType to represent a Car
        carAssetTypeId = uuidv4();
        const assetTypeRequest: ICreateAssetTypeRequest = {
            assetTypeId: carAssetTypeId,
            type: "Unique",
        };
        return platformClient.createAssetType(assetTypeRequest, mvaKeyPair);
    })
    .then(() => {
        // 2. create an Identity for Alice (an individual)
        aliceKeyPair = platformUtils.generateKeypairWithProtocolId(protocolId);
        const aliceIdentityRequest: ICreateIdentityRequest = {
            identityId: aliceKeyPair.identityId,
            publicCredentials : {
                key: aliceKeyPair.pubKeyBase64,
                protocolId,
            },
        };
        return platformClient.createIdentity(aliceIdentityRequest, aliceKeyPair);
    })
    .then( () => {
        // 3. create an Identity for Bob (an individual)
        bobKeyPair = platformUtils.generateKeypairWithProtocolId(protocolId);
        const bobIdentityRequest: ICreateIdentityRequest = {
            identityId: bobKeyPair.identityId,
            publicCredentials : {
                key: bobKeyPair.pubKeyBase64,
                protocolId,
            },
        };
        return platformClient.createIdentity(bobIdentityRequest, bobKeyPair);
    })
    .then (() => {
        // 4. Alice creates an instance of a car AssetType
        aliceCarAssetId  = uuidv4();
        const aliceCarRequest: ICreateAssetRequest = {
            assetId: aliceCarAssetId,
            assetTypeId: carAssetTypeId,
        };
        return platformClient.createAsset(aliceCarRequest, aliceKeyPair);
    })
    .then( () => {
        // 5. Alice claims the first registration of the car happened in 2010
        claims = [
            "first-registration:10/02/2010",
        ];
        const claimsRequest: ICreateClaimsRequest = {
            claims: platformUtils.createClaimsHashArray(claims),
            subjectId: aliceCarAssetId,
            subjectTypeId: carAssetTypeId,
        };
        return platformClient.createAssetClaims(claimsRequest, claims, aliceKeyPair);
    })
    .then (() => {
        // 6. MVA endorses Alice's claim of the registration date (as it's the authority anyone can trust that endorsement)
        //    This requires that both Alice and MVA signs the request
        const endorsements = platformUtils.createEndorsementsObject(
            aliceCarAssetId,
            claims,
            mvaKeyPair,
            carAssetTypeId,
        );
        const endorsementRequest: IEndorseClaimsRequest = {
            _type: "CreateAssetEndorsementsRequest",
            endorsements,
            endorserId: mvaKeyPair.identityId,
            subjectId: aliceCarAssetId,
            subjectTypeId: carAssetTypeId,
        };
        const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(endorsementRequest, aliceKeyPair);
        const finalRequest: IAuthorisedRequest = platformClient.addSignatureRequest(
            signedRequest,
            mvaKeyPair,
        );
        return platformClient.endorseAssetClaims(finalRequest, claims, mvaKeyPair);
    })
    .then( () => {
        // 7. Bob want's to buy the car and checks that the registration claim from Alice is in fact endorsed by the MVA
        const claimHash = platformUtils.hash("sha256", claims[0]);
        return platformClient.getAssetClaimEndorsement(aliceCarAssetId, carAssetTypeId, claimHash, mvaKeyPair.identityId, bobKeyPair);
    })
    .then( () => {
        // 8. (off-chain) Bob is happy with the car and trusts the registration year now - he pays Alice the requested amount of money

        // 9. Alice in turn transfers the car instance to Bob
        const carTransfer: ITransferOwnership = {
            assetId: aliceCarAssetId,
            assetTypeId: carAssetTypeId,
            fromIdentityId: aliceKeyPair.identityId,
            toIdentityId: bobKeyPair.identityId,
        };
        const carTransferRequest: ITransferRequest = {
            _type: "TransfersRequest",
            transfers: [
                carTransfer,
            ],
        };
        const signedRequest: IAuthorisedRequest = platformClient.prepareRequest(carTransferRequest, aliceKeyPair);
        return platformClient.transferAssets(signedRequest, aliceKeyPair);
    })
    .then( () => {
        // 10. The end - at this point Bob is the Owner of the Unique Asset (Alice's Car)
        return platformClient.getAsset(aliceCarAssetId, carAssetTypeId, bobKeyPair);
    })
    .then( (assetResponse) => {
        console.log(`Bob's identity "${bobKeyPair.identityId}" is the new car owner`);
        console.log (assetResponse);
    })
    .catch( (error) => {
        console.error (error);
    });

}

carPurchase();
