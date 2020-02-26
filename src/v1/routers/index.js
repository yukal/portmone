module.exports = (express, controllers) => {
    const router = express.Router();

    router.post('/encode', controllers.ctrlBill.rtEncode);
    router.post('/decode', controllers.ctrlBill.rtDecode);
    router.post('/bill', controllers.ctrlBill.rtBill);
    router.post('/pin', controllers.ctrlBill.rtCheckPin);

    return router;
};
