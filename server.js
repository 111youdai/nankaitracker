const https = require("https");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

app.get("/api/train", (req, res) => {

    const trainNumber = req.query.train_number;
    const diaKind = req.query.dia_kind || "2";
    const interfaceNo = req.query.interface_no || "1";
    const baseTime = req.query.base_time || "00:00:00";

    if (!trainNumber) {
        return res.status(400).json({
            error: "train_number が必要です"
        });
    }

    const params = new URLSearchParams({
        dia_kind: diaKind,
        interface_no: interfaceNo,
        base_time: baseTime,
        train_number: trainNumber
    });

    const url =
        `https://api-service.nankaiapp.com/api/v1/diagram/train?${params}`;

    console.log("南海APIへ問い合わせ:", url);

    https.get(url, response => {

        let data = "";

        response.on("data", chunk => {
            data += chunk;
        });

        response.on("end", () => {

            console.log("南海APIレスポンス:", data);

            res.status(response.statusCode || 200);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.send(data);
        });

    }).on("error", error => {

        console.error(error);

        res.status(500).json({
            error: error.message
        });
    });
});

app.listen(3000, () => {
    console.log("🚃 Server running on http://localhost:3000");
});