import { Router } from "express";
import productsRoutes from "./products.routes";
import offersRoutes from "./offers.routes";
import categoriesRoutes from "./categories.routes";
import brandsRoutes from "./brands.routes";
import bannersRoutes from "./banners.routes";

const router = Router();

router.use("/products", productsRoutes);
router.use("/offers", offersRoutes);
router.use("/categories", categoriesRoutes);
router.use("/brands", brandsRoutes);
router.use("/banners", bannersRoutes);

export default router;
