(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-2d20ee10"],{b0f2:function(t,n,a){"use strict";a.r(n);var e=function(){var t=this,n=t.$createElement,a=t._self._c||n;return a("div",[a("b-jumbotron",[a("b-container",[a("h1",{staticClass:"h3"},[t._v("API поповнення Київстар-рахунку без комісії")]),a("p",[t._v("Даний додаток не є офіційною розробкою компанії Київстар і працює в тестовому режимі з метою\n                навчання взаємодії між сторонніми сервісами використовуючи банківську картку. Проте за бажанням \n                ви можете скористатись даним сервісом використовуючи три простих кроки.\n              ")]),a("p",[t._v("This is a test API application for replenishing a mobile account only for Kyivstar users living in Ukraine")])])],1),a("b-container",[a("b-row",[a("b-col",{attrs:{md:"6"}},[a("h3",[t._v("1. Створіть ключ")]),a("p",{staticClass:"text-muted d-block mb-4"},[t._v("Створіть "),a("a",{attrs:{href:"#/encode"}},[t._v("ключ авторизації")]),t._v(". \n                  Даний ключ є результатом кодування даних вашої картки, який ви можете застосувати кожен \n                  раз за необхідністю поповнення рахунку на даному ресурсі.\n                  ")]),a("pre",[t._v('POST /v1/encode\n{\n  "MM": "XX",\n  "YY": "XX",\n  "cvv2": "XXX",\n  "card_number": "XXXXXXXXXXXXXXXX"\n}')])]),a("b-col",{attrs:{md:"6"}},[a("h3",[t._v("2. Поповніть рахунок")]),a("p",{staticClass:"text-muted d-block mb-4"},[t._v("Перейдіть "),a("a",{attrs:{href:"#/dashboard"}},[t._v("на головну")]),t._v(' \n                  та введіть щойно створений ключ авторизації в текстове поле, вкажіть суму поповнення \n                  та номер телефону. Далі натисніть "Сплатити", та очікуйте смс.')]),a("pre",[t._v('POST /v1/bill\n{\n  "amount": "1",\n  "phone": "0979999999",\n  "authKey": "...",\n}')])]),a("b-col",{attrs:{md:"6"}},[a("h3",[t._v("3. Підтвердіть оплату")]),a("p",{staticClass:"text-muted d-block mb-4"},[t._v("Відправлений запит поповнення рахунку потрапляє в чергу до серверу \n                  де обробляє інформацію кредитної картки та висилає смс з пін кодом для підтвердження зняття коштів з рахунку.")]),a("pre",[t._v('POST /v1/pin\n{\n  "PHPSESSID": "F610F591202A954B1F0393975B819E2E",\n  "sid": "1F0393975B819E2EF610F591202A954B",\n  "pin": "222856"\n}')])]),a("b-col",{attrs:{md:"6"}},[a("h3",[t._v("Поради")]),a("p",{staticClass:"text-muted d-block mb-4"},[t._v("Після повторного поповнення рахунку вам більше не потрібно \n                  створювати ключ авторизації, хіба що ви маєте ще одну кредитну карту.")]),a("p",{staticClass:"text-muted d-block mb-4"},[t._v("Увага! Ніколи і нікому не передавайте дані вашої карти, \n                  або створенного ключа авторизації та зберігайте ці дані в захищених місцях, наприклад за допомогою програми \n                  "),a("a",{attrs:{href:"https://www.enpass.io/",target:"blank"}},[t._v("Enpass")]),t._v(".")])])],1)],1)],1)},s=[],r=a("2877"),c={},o=Object(r["a"])(c,e,s,!1,null,null,null);n["default"]=o.exports}}]);
//# sourceMappingURL=chunk-2d20ee10.d81bb09b.js.map