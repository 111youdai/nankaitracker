const https = require("https");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));

const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

function getNankaiPassword() {
    return String(
        process.env.NANKAI_ACCESS_PASSWORD || ""
    );
}

function safeEqualText(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));

    if (left.length !== right.length) {
        return false;
    }

    return crypto.timingSafeEqual(left, right);
}

function createAuthToken() {
    const password = getNankaiPassword();

    if (!password) {
        throw new Error(
            "NANKAI_ACCESS_PASSWORD が設定されていません"
        );
    }

    const payload = Buffer.from(
        JSON.stringify({
            exp: Date.now() + AUTH_TTL_MS,
            nonce: crypto
                .randomBytes(16)
                .toString("hex")
        })
    ).toString("base64url");

    const signature = crypto
        .createHmac("sha256", password)
        .update(payload)
        .digest("base64url");

    return `${payload}.${signature}`;
}

function verifyAuthToken(token) {
    const password = getNankaiPassword();

    if (!password || !token) {
        return false;
    }

    const parts = String(token).split(".");

    if (parts.length !== 2) {
        return false;
    }

    const [payload, signature] = parts;

    const expectedSignature = crypto
        .createHmac("sha256", password)
        .update(payload)
        .digest("base64url");

    if (
        !safeEqualText(
            signature,
            expectedSignature
        )
    ) {
        return false;
    }

    try {
        const decoded = JSON.parse(
            Buffer.from(
                payload,
                "base64url"
            ).toString("utf8")
        );

        return (
            Number.isFinite(
                Number(decoded.exp)
            ) &&
            Date.now() < Number(decoded.exp)
        );

    } catch (error) {
        return false;
    }
}

function getBearerToken(req) {
    const authorization =
        String(
            req.headers.authorization || ""
        );

    if (
        !authorization
            .toLowerCase()
            .startsWith("bearer ")
    ) {
        return "";
    }

    return authorization.slice(7).trim();
}

function hasNankaiAuth(req) {
    return verifyAuthToken(
        getBearerToken(req)
    );
}

app.get("/", (req, res) => {
    res.json({
        ok: true,
        service: "nankaitracker"
    });
});

app.post(
    "/api/auth/nankai",
    (req, res) => {
        const configuredPassword =
            getNankaiPassword();

        if (!configuredPassword) {
            return res.status(503).json({
                ok: false,
                error:
                    "南海線認証がサーバー側で設定されていません"
            });
        }

        const submittedPassword =
            String(
                req.body?.password || ""
            );

        if (
            !safeEqualText(
                submittedPassword,
                configuredPassword
            )
        ) {
            return res.status(401).json({
                ok: false,
                error:
                    "パスワードが違います"
            });
        }

        return res.json({
            ok: true,
            token: createAuthToken(),
            expires_in:
                Math.floor(
                    AUTH_TTL_MS / 1000
                )
        });
    }
);

app.get(
    "/api/auth/nankai/verify",
    (req, res) => {
        if (!hasNankaiAuth(req)) {
            return res.status(401).json({
                ok: false
            });
        }

        return res.json({
            ok: true
        });
    }
);

app.get("/api/train", (req, res) => {
    const trainNumber =
        req.query.train_number;

    const diaKind =
        String(
            req.query.dia_kind || "2"
        );

    const interfaceNo =
        req.query.interface_no || "1";

    const baseTime =
        req.query.base_time || "00:00:00";

    /*
     * 南海線（dia_kind=1）の詳細APIだけは
     * 共通パスワード認証済みトークンを必須にする。
     */
    if (
        diaKind === "1" &&
        !hasNankaiAuth(req)
    ) {
        return res.status(401).json({
            error:
                "南海線の閲覧認証が必要です"
        });
    }

    if (!trainNumber) {
        return res.status(400).json({
            error:
                "train_number が必要です"
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

    console.log(
        "南海APIへ問い合わせ:",
        url
    );

    https.get(url, response => {
        let data = "";

        response.on("data", chunk => {
            data += chunk;
        });

        response.on("end", () => {
            console.log(
                "南海APIレスポンス:",
                data
            );

            res.status(
                response.statusCode || 200
            );

            res.setHeader(
                "Content-Type",
                "application/json; charset=utf-8"
            );

            res.send(data);
        });

    }).on("error", error => {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    });
});

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `Server running on port ${PORT}`
    );
});
