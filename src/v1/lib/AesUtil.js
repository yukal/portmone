// AES Encryption/Decryption with AES-256-GCM using random Initialization Vector + Salt
// ----------------------------------------------------------------------------------------
// the encrypted datablock is hex encoded for easy data exchange. 
// if you have the option to store data binary save consider to remove the encoding to reduce storage size
// ----------------------------------------------------------------------------------------
// format of encrypted data - used by this example. not an official format
//
// +--------------------+-----------------------+----------------+----------------+
// | SALT               | Initialization Vector | Auth Tag       | Payload        |
// | Used to derive key | AES GCM XOR Init      | Data Integrity | Encrypted Data |
// | 64 Bytes, random   | 16 Bytes, random      | 16 Bytes       | (N-96) Bytes   |
// +--------------------+-----------------------+----------------+----------------+
//
// ----------------------------------------------------------------------------------------
// Input/Output Vars
//
// MASTERKEY: the key used for encryption/decryption. 
//            it has to be cryptographic safe - this means randomBytes or derived by pbkdf2 (for example)
// TEXT:      data (utf8 string) which should be encoded. modify the code to use Buffer for binary data!
// ENCDATA:   encrypted data as hex string (format mentioned on top)

// load the build-in crypto functions
const crypto = require('crypto');

// encrypt/decrypt functions
module.exports = {

    /**
     * Encrypts text by given key
     * @param String text to encrypt
     * @param Buffer masterkey
     * @param String (optional) encoding format [hex, ascii, binary]
     * @returns String|Buffer encrypted text, hex encoded
     */
    encrypt: function (text, masterkey, encoding='hex') {
        // random initialization vector
        const iv = crypto.randomBytes(16);

        // random salt
        const salt = crypto.randomBytes(64);

        // derive encryption key: 32 byte key length
        // in assumption the masterkey is a cryptographic and NOT a password there is no need for
        // a large number of iterations. It may can replaced by HKDF
        // the value of 2145 is randomly chosen!
        const key = crypto.pbkdf2Sync(masterkey, salt, 2145, 32, 'sha512');

        // AES 256 GCM Mode
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        // encrypt the given text
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

        // extract the auth tag
        const tag = cipher.getAuthTag();

        // generate output
        return encoding 
            ? Buffer.concat([salt, iv, tag, encrypted]).toString(encoding)
            : Buffer.concat([salt, iv, tag, encrypted])
        ;
    },

    /**
     * Decrypts text by given key
     * @param String hex encoded input data
     * @param Buffer masterkey
     * @returns String decrypted (original) text
     */
    decrypt: function (encodedData, masterkey, decoding='hex') {
        let decrypted = false;
        try {
            // decoding
            const buffer = (encodedData instanceof Buffer) 
                ?encodedData :Buffer.from(encodedData, decoding);

            // convert data to buffers
            const salt = buffer.slice(0, 64);
            const iv = buffer.slice(64, 80);
            const tag = buffer.slice(80, 96);
            const text = buffer.slice(96);

            // derive key using; 32 byte key length
            const key = crypto.pbkdf2Sync(masterkey, salt , 2145, 32, 'sha512');

            // AES 256 GCM Mode
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);

            // encrypt the given text
            decrypted = decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');
        } catch(error) {
            //
        }

        return decrypted;
    }
};
