import { Router, type IRouter } from "express";
import healthRouter from "./health";
import foodBusinessRouter from "./food-business";

const router: IRouter = Router();

router.use(healthRouter);
router.use(foodBusinessRouter);

export default router;
