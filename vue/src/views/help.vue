<template>
    <div>

      <b-jumbotron>
          <b-container>
              <h1 class="h3">API поповнення Київстар-рахунку без комісії</h1>
              <p>Даний додаток не є офіційною розробкою компанії Київстар і працює в тестовому режимі з метою
                навчання взаємодії між сторонніми сервісами використовуючи банківську картку. Проте за бажанням 
                ви можете скористатись даним сервісом використовуючи три простих кроки.
              </p>
              <p>This is a test API application for replenishing a mobile account only for Kyivstar users living in Ukraine</p>
          </b-container>
      </b-jumbotron>

      <b-container>
          <b-row>
              <b-col md=6>
                  <h3>1. Створіть ключ</h3>
                  <p class="text-muted d-block mb-4">Створіть <a href="#/encode">ключ авторизації</a>. 
                  Даний ключ є результатом кодування даних вашої картки, який ви можете застосувати кожен 
                  раз за необхідністю поповнення рахунку на даному ресурсі.
                  </p>
                  <pre>POST /v1/bill/encode-ccard
{
  "MM": "XX",
  "YY": "XX",
  "cvv2": "XXX",
  "card_number": "XXXXXXXXXXXXXXXX"
}</pre>
              </b-col>

              <b-col md=6>
                  <h3>2. Поповніть рахунок</h3>
                  <p class="text-muted d-block mb-4">Перейдіть <a href="#/dashboard">на головну</a> 
                  та введіть щойно створений ключ авторизації в текстове поле, вкажіть суму поповнення 
                  та номер телефону. Далі натисніть "Сплатити", та очікуйте смс.</p>
                  <pre>POST /v1/bill/pay
{
  "amount": 1,
  "phone": "0979999999",
  "authKey": "maA$cdTXIe$9~*$)HEgdL[6r5Z6+YhD0",
}</pre>
              </b-col>

              <b-col md=6>
                  <h3>3. Підтвердіть оплату</h3>
                  <p class="text-muted d-block mb-4">Відправлений запит поповнення рахунку потрапляє в чергу до серверу 
                  де обробляє інформацію кредитної картки та висилає смс з пін кодом для підтвердження зняття коштів з рахунку.</p>
                  <pre>POST /v1/bill/pay-confirm
{
  "pin": 222856
}</pre>
              </b-col>

              <b-col md=6>
                  <h3>Поради</h3>
                  <p class="text-muted d-block mb-4">Після повторного поповнення рахунку вам більше не потрібно 
                  створювати ключ авторизації, хіба що ви маєте ще одну кредитну карту.</p>
                  <p class="text-muted d-block mb-4">Увага! Ніколи і нікому не передавайте дані вашої карти, 
                  або створенного ключа авторизації та зберігайте ці дані в захищених місцях, наприклад за допомогою програми 
                  <a href="https://www.enpass.io/" target="blank">Enpass</a>.</p>
              </b-col>
          </b-row>
      </b-container>

    </div>
</template>
