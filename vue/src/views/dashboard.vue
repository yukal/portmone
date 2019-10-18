<template>
    <b-container class="py-4">

        <b-form @submit="onSubmit">
            <b-row>
                <b-col sm=8>
                    <b-form-group label="Ключ авторизації:" label-for="auth-data">
                        <b-form-textarea id="auth-data" rows="8" v-model="data.authKey" required></b-form-textarea>
                    </b-form-group>
                </b-col>

                <b-col sm=4>
                    <b-form-group label="Сума поповнення (грн):" label-for="input-amount">
                        <b-form-input required type="text" id="input-amount" v-model="data.amount" 
                        placeholder="Сума в гривнях" size="lg"></b-form-input>
                    </b-form-group>

                    <b-form-group label="Мобільний телефон:" label-for="select-phone">
                        <b-form-input required type="text" id="select-phone" v-model="data.phone" 
                        placeholder="0971234567" size="lg"></b-form-input>
                    </b-form-group>

                    <b-form-group>
                        <b-button type="submit" variant="primary" class="px-5 mt-2">Сплатити</b-button>
                    </b-form-group>
                </b-col>
            </b-row>
        </b-form>

        <b-form @submit="onConfirm" class="mt-5">
            <b-row>
                <b-col sm=8>
                    <b-form-group label="Пін:" label-for="input-pin">
                        <b-form-input required type="text" id="input-pin" v-model="confirmData.pin" 
                        placeholder="Введіть отриманий пін з смс" size="lg"></b-form-input>
                    </b-form-group>
                </b-col>

                <b-col sm=4>
                    <b-form-group label=" ">
                        <b-button type="submit" variant="primary" class="px-5 mt-2">Підтвердити оплату</b-button>
                    </b-form-group>
                </b-col>
            </b-row>
        </b-form>

    </b-container>
</template>

<script>
import js from '@/controllers/dashboard';
export default js;
</script>

<style></style>
