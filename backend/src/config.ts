import path from 'path';
import { keyStores } from "near-api-js";

export const PORT = process.env.PORT || 8000;
export const MONGOURL = process.env.MONGOURL;
export const JWTSECRET = process.env.JWTSECRET;
export const JWTEXPIRATION = process.env.JWTEXPIRATION;
export const WHITE_LIST = process.env.WHITE_LIST;
export const LIVE_TIME = process.env.LIVE_TIME;
export const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;
export const FEE = process.env.FEE;

const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(__dirname, `/../${CREDENTIALS_DIR}`);
export const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);
export const nearConfig = {
    keyStore,
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.near.org",
};

export const RequirementsOptions = [
    { name: "Follow", value: "follow" },
    { name: "Like", value: "like" },
    { name: "Repost", value: "repost" },
    { name: "Comment", value: "comment" },
    { name: "Iam human verified", value: "human" },
];

export const CampaignStatusType = {
    live: "live",
    expired: "expired",
}