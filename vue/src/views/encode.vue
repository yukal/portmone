<template>
    <b-container class="py-4">

        <b-form @submit="onSubmit">
            <b-row>
                <b-col sm=6>
                    <b-form-group label="Кредитна карта:" label-for="input-cnum">
                        <b-form-input required type="text" id="input-cnum" size="lg" v-model="CCARD.card_number" 
                        placeholder="Номер карти"></b-form-input>
                    </b-form-group>
                </b-col>
                <b-col sm=6>
                    <b-form-group label="cvv2 код:" label-for="input-cvv2">
                        <b-form-input required type="text" id="input-cvv2" size="lg" v-model="CCARD.cvv2" 
                        placeholder="cvv2 код карти"></b-form-input>
                    </b-form-group>
                </b-col>
            </b-row>

            <b-row>
                <b-col sm=3>
                    <b-form-group label="Місяць картки:" label-for="select-mm">
                        <b-form-select id="select-mm" size="lg" v-model="CCARD.MM" :options="month" required></b-form-select>
                    </b-form-group>
                </b-col>
                <b-col sm=3>
                    <b-form-group label="Рік картки:" label-for="select-yy">
                        <b-form-select id="select-yy" size="lg" v-model="CCARD.YY" :options="years" required></b-form-select>
                    </b-form-group>
                </b-col>

                <b-col></b-col>

                <b-col sm=4 md=3>
                    <b-form-group label=" ">
                        <b-button block type="submit" variant="primary">Кодувати</b-button>
                    </b-form-group>
                </b-col>
            </b-row>
        </b-form>

        <b-form class="mt-4">
            <b-form-group label="Ключ авторизації:" label-for="auth-key">
                <b-form-textarea id="auth-key" rows="14" v-model="authKey"></b-form-textarea>
            </b-form-group>
        </b-form>

    </b-container>
</template>

<script>
import js from '@/controllers/encode';
export default js;
</script>

<style></style>
