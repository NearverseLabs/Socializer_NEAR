import { Router } from 'express';
import { get, getNFTInfo } from '../controllers/stake';

const router: Router = Router();

router.get("/get-nfts", get);
router.get("/get-nft-info", getNFTInfo);

export default router;
