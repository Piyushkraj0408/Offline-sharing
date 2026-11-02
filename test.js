
const baseUrl = process.argv[2] || "http://localhost:3000";
const filePath = process.argv[3];
const clients = Number.parseInt(process.argv[4] || "100", 10);

if (!filePath) {
    console.log(
        'Usage: node load-test.js <server-url> "<file-path>" [clients]'
    );
    console.log(
        'Example: node load-test.js http://192.168.1.10:3000 "installer.zip" 100'
    );
    process.exit(1);
}

if (!Number.isInteger(clients) || clients < 1 || clients > 100) {
    console.error("Clients must be between 1 and 100.");
    process.exit(1);
}

const url = new URL("/download", baseUrl);
url.searchParams.set("path", filePath);

function formatMB(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}

async function download(clientId) {
    const start = performance.now();
    let bytes = 0;

    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(30 * 60 * 1000)
        });

        if (!response.ok || !response.body) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Consume the response without saving a copy to disk.
        const reader = response.body.getReader();

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            bytes += value.byteLength;
        }

        const seconds = (performance.now() - start) / 1000;
        const speed = seconds > 0
            ? bytes / (1024 * 1024) / seconds
            : 0;

        console.log(
            `Student ${clientId}: SUCCESS | ` +
            `${formatMB(bytes)} MB | ` +
            `${seconds.toFixed(2)} sec | ` +
            `${speed.toFixed(2)} MB/s`
        );

        return { success: true, bytes, seconds };
    } catch (error) {
        console.log(
            `Student ${clientId}: FAILED | ${error.message}`
        );

        return { success: false, bytes: 0, seconds: 0 };
    }
}

async function main() {
    console.log("==================================");
    console.log(" Smart Share Load Test");
    console.log("==================================");
    console.log(`Server: ${baseUrl}`);
    console.log(`File: ${filePath}`);
    console.log(`Concurrent students: ${clients}`);
    console.log("Starting downloads...\n");

    const start = performance.now();

    // All simulated clients start concurrently.
    const results = await Promise.all(
        Array.from({ length: clients }, (_, i) => download(i + 1))
    );

    const elapsed = (performance.now() - start) / 1000;
    const successful = results.filter(r => r.success);
    const failed = results.length - successful.length;

    const totalBytes = successful.reduce(
        (sum, result) => sum + result.bytes, 0
    );

    const totalMB = totalBytes / (1024 * 1024);
    const aggregateSpeed = elapsed > 0 ? totalMB / elapsed : 0;

    console.log("\n==================================");
    console.log(" RESULTS");
    console.log("==================================");
    console.log(`Successful: ${successful.length}/${clients}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total data served: ${formatMB(totalBytes)} MB`);
    console.log(`Total elapsed time: ${elapsed.toFixed(2)} seconds`);
    console.log(
        `Aggregate throughput: ${aggregateSpeed.toFixed(2)} MB/s`
    );
    console.log("==================================");
}

main().catch(console.error);
