module.exports = (express, controllers) => {
    const router = express.Router();

    router.post('/encode', controllers.ctrlBill.encode);
    router.post('/decode', controllers.ctrlBill.decode);
    router.post('/bill', controllers.ctrlBill.bill);
    router.post('/pin', controllers.ctrlBill.checkPin);

    return router;
};
