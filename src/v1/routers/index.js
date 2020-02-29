module.exports = (express, controllers) => {
    const router = express.Router();

    router.post('/bill/pay', controllers.bill.actPostPay);
    router.post('/bill/pay-confirm', controllers.bill.actPostPayConfirm);
    router.post('/bill/encode-ccard', controllers.bill.actPostEncodeCcard);
    router.post('/bill/decode-ccard', controllers.bill.actPostDecodeCcard);

    return router;
};
