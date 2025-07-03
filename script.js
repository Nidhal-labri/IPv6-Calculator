// IPv6 Subnet Calculator
class IPv6Calculator {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const calculateBtn = document.getElementById("calculate-btn");
        const ipv6Input = document.getElementById("ipv6-address");
        const prefixInput = document.getElementById("prefix-length");

        calculateBtn.addEventListener("click", () => this.calculate());
        
        // Real-time calculation on input
        ipv6Input.addEventListener("input", () => this.debounceCalculate());
        prefixInput.addEventListener("input", () => this.debounceCalculate());

        // Real-time validation
        ipv6Input.addEventListener("blur", () => this.validateIPv6(ipv6Input.value));
        prefixInput.addEventListener("blur", () => this.validatePrefix(prefixInput.value));
    }

    debounceCalculate() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            const ipv6 = document.getElementById("ipv6-address").value.trim();
            const prefix = document.getElementById("prefix-length").value.trim();
            if (ipv6 && prefix) {
                this.calculate();
            }
        }, 500);
    }

    calculate() {
        const ipv6Address = document.getElementById("ipv6-address").value.trim();
        const prefixLength = document.getElementById("prefix-length").value.trim();

        // Clear previous error messages
        this.clearErrors();

        try {
            // Input validation
            if (!this.validateIPv6(ipv6Address)) {
                throw new Error("Invalid IPv6 Address");
            }

            if (!this.validatePrefix(prefixLength)) {
                throw new Error("Invalid Prefix Length");
            }

            // Parse prefix length
            const prefix = parseInt(prefixLength.replace("/", ""));

            // Expand IPv6 address to full form
            const expandedAddress = this.expandIPv6(ipv6Address);

            // Calculate network parameters
            const networkAddress = this.calculateNetworkAddress(expandedAddress, prefix);
            const firstHost = this.calculateFirstHost(networkAddress);
            const lastHost = this.calculateLastHost(networkAddress, prefix);
            const hostCount = this.calculateHostCount(prefix);
            const subnetId = this.getSubnetId(expandedAddress, prefix);
            const interfaceId = this.getInterfaceId(expandedAddress, prefix);
            const compressedForm = this.compressIPv6(expandedAddress);

            // Display results
            this.displayResults({
                networkAddress: this.compressIPv6(networkAddress),
                firstHost: this.compressIPv6(firstHost),
                lastHost: this.compressIPv6(lastHost),
                hostCount,
                prefixLength: `/${prefix}`,
                subnetId: this.compressIPv6(subnetId),
                interfaceId: this.compressIPv6(interfaceId),
                compressedForm
            });

        } catch (error) {
            this.showError(error.message);
        }
    }

    validateIPv6(address) {
        // Basic IPv6 validation
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
        const compressedRegex = /^([0-9a-fA-F]{0,4}:)*::([0-9a-fA-F]{0,4}:)*[0-9a-fA-F]{0,4}$/;
        
        if (!address) return false;
        
        // Check for double colon (compressed form)
        if (address.includes("::")) {
            return compressedRegex.test(address) && (address.match(/::/g) || []).length === 1;
        }
        
        // Check full form
        const parts = address.split(":");
        if (parts.length !== 8) return false;
        
        return parts.every(part => /^[0-9a-fA-F]{0,4}$/.test(part));
    }

    validatePrefix(prefix) {
        if (!prefix) return false;
        
        const prefixNum = parseInt(prefix.replace("/", ""));
        return prefixNum >= 0 && prefixNum <= 128;
    }

    expandIPv6(address) {
        // Handle compressed form with ::
        if (address.includes("::")) {
            const parts = address.split("::");
            const leftParts = parts[0] ? parts[0].split(":") : [];
            const rightParts = parts[1] ? parts[1].split(":") : [];
            
            const missingParts = 8 - leftParts.length - rightParts.length;
            const middleParts = Array(missingParts).fill("0000");
            
            const allParts = [...leftParts, ...middleParts, ...rightParts];
            address = allParts.join(":");
        }
        
        // Pad each part to 4 digits
        return address.split(":").map(part => part.padStart(4, "0")).join(":");
    }

    compressIPv6(address) {
        // Remove leading zeros
        let compressed = address.split(":").map(part => part.replace(/^0+/, "") || "0").join(":");
        
        // Find longest sequence of consecutive zeros
        let longestZeroSequence = "";
        let currentZeroSequence = "";
        let inZeroSequence = false;
        
        const parts = compressed.split(":");
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === "0") {
                if (!inZeroSequence) {
                    currentZeroSequence = "0";
                    inZeroSequence = true;
                } else {
                    currentZeroSequence += ":0";
                }
            } else {
                if (inZeroSequence) {
                    if (currentZeroSequence.length > longestZeroSequence.length) {
                        longestZeroSequence = currentZeroSequence;
                    }
                    inZeroSequence = false;
                }
            }
        }
        
        // Check if the last sequence was zeros
        if (inZeroSequence && currentZeroSequence.length > longestZeroSequence.length) {
            longestZeroSequence = currentZeroSequence;
        }
        
        // Replace longest sequence with ::
        if (longestZeroSequence.length > 1) {
            compressed = compressed.replace(longestZeroSequence, "::");
            // Handle edge cases
            compressed = compressed.replace(/^:/, "");
            compressed = compressed.replace(/:$/, "");
            if (compressed === "") compressed = "::";
        }
        
        return compressed;
    }

    calculateNetworkAddress(expandedAddress, prefix) {
        const parts = expandedAddress.split(":");
        const binaryAddress = parts.map(part => parseInt(part, 16).toString(2).padStart(16, "0")).join("");
        
        const networkBinary = binaryAddress.substring(0, prefix) + "0".repeat(128 - prefix);
        
        const networkParts = [];
        for (let i = 0; i < 8; i++) {
            const part = networkBinary.substring(i * 16, (i + 1) * 16);
            networkParts.push(parseInt(part, 2).toString(16).padStart(4, "0"));
        }
        
        return networkParts.join(":");
    }

    calculateFirstHost(networkAddress) {
        const parts = networkAddress.split(":");
        const lastPart = parseInt(parts[7], 16);
        parts[7] = (lastPart + 1).toString(16).padStart(4, "0");
        return parts.join(":");
    }

    calculateLastHost(networkAddress, prefix) {
        const parts = networkAddress.split(":");
        const binaryNetwork = parts.map(part => parseInt(part, 16).toString(2).padStart(16, "0")).join("");
        
        const hostBits = 128 - prefix;
        const lastHostBinary = binaryNetwork.substring(0, prefix) + "1".repeat(hostBits - 1) + "0";
        
        const lastHostParts = [];
        for (let i = 0; i < 8; i++) {
            const part = lastHostBinary.substring(i * 16, (i + 1) * 16);
            lastHostParts.push(parseInt(part, 2).toString(16).padStart(4, "0"));
        }
        
        return lastHostParts.join(":");
    }

    calculateHostCount(prefix) {
        const hostBits = 128 - prefix;
        if (hostBits > 53) {
            return "2^" + hostBits + " (too large to display)";
        }
        return Math.pow(2, hostBits).toLocaleString();
    }

    getSubnetId(expandedAddress, prefix) {
        // Subnet ID is the network portion
        return this.calculateNetworkAddress(expandedAddress, prefix);
    }

    getInterfaceId(expandedAddress, prefix) {
        const parts = expandedAddress.split(":");
        const binaryAddress = parts.map(part => parseInt(part, 16).toString(2).padStart(16, "0")).join("");
        
        const interfaceBinary = "0".repeat(prefix) + binaryAddress.substring(prefix);
        
        const interfaceParts = [];
        for (let i = 0; i < 8; i++) {
            const part = interfaceBinary.substring(i * 16, (i + 1) * 16);
            interfaceParts.push(parseInt(part, 2).toString(16).padStart(4, "0"));
        }
        
        return interfaceParts.join(":");
    }

    displayResults(results) {
        document.getElementById("network-address").textContent = results.networkAddress;
        document.getElementById("first-host").textContent = results.firstHost;
        document.getElementById("last-host").textContent = results.lastHost;
        document.getElementById("host-count").textContent = results.hostCount;
        document.getElementById("prefix-display").textContent = results.prefixLength;
        document.getElementById("subnet-id").textContent = results.subnetId;
        document.getElementById("interface-id").textContent = results.interfaceId;
        document.getElementById("compressed-form").textContent = results.compressedForm;

        // Animation for results appearance
        const resultsSection = document.getElementById("results-section");
        resultsSection.style.opacity = "0";
        resultsSection.style.transform = "translateY(20px)";
        
        setTimeout(() => {
            resultsSection.style.transition = "all 0.5s ease-out";
            resultsSection.style.opacity = "1";
            resultsSection.style.transform = "translateY(0)";
        }, 100);
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.querySelector(".error-message");
        if (!errorDiv) {
            errorDiv = document.createElement("div");
            errorDiv.className = "error-message";
            document.querySelector(".input-section").appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        // Add error class to fields
        document.getElementById("ipv6-address").classList.add("error");
        document.getElementById("prefix-length").classList.add("error");
    }

    clearErrors() {
        const errorDiv = document.querySelector(".error-message");
        if (errorDiv) {
            errorDiv.remove();
        }
        
        document.getElementById("ipv6-address").classList.remove("error");
        document.getElementById("prefix-length").classList.remove("error");
    }
}

// Additional utilities for IPv6
class IPv6Utils {
    static isLinkLocal(address) {
        return address.toLowerCase().startsWith("fe80:");
    }

    static isUniqueLocal(address) {
        const firstByte = parseInt(address.substring(0, 2), 16);
        return (firstByte & 0xfe) === 0xfc;
    }

    static isLoopback(address) {
        return address === "::1" || address === "0000:0000:0000:0000:0000:0000:0000:0001";
    }

    static isUnspecified(address) {
        return address === "::" || address === "0000:0000:0000:0000:0000:0000:0000:0000";
    }

    static getAddressType(address) {
        if (this.isLoopback(address)) return "Loopback";
        if (this.isUnspecified(address)) return "Unspecified";
        if (this.isLinkLocal(address)) return "Link-Local";
        if (this.isUniqueLocal(address)) return "Unique Local";
        return "Global Unicast";
    }
}

// Application initialization
document.addEventListener("DOMContentLoaded", () => {
    new IPv6Calculator();
    
    // Predefined examples
    const examples = [
        { ipv6: "2001:0db8:85a3:0000:0000:8a2e:0370:7334", prefix: "/64" },
        { ipv6: "2001:db8::1", prefix: "/48" },
        { ipv6: "fe80::1", prefix: "/64" }
    ];
    
    // Add example buttons
    const inputSection = document.querySelector(".input-section");
    const exampleDiv = document.createElement("div");
    exampleDiv.className = "examples";
    exampleDiv.innerHTML = `
        <p style="margin: 20px 0 10px 0; font-weight: 500; color: var(--text-secondary);">
            <i class="fas fa-lightbulb"></i> Quick Examples:
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${examples.map((ex, i) => 
                `<button class="example-btn" data-ipv6="${ex.ipv6}" data-prefix="${ex.prefix}" 
                 style="padding: 8px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; 
                        border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
                        font-family: 'Courier New', monospace;">
                    ${ex.ipv6} ${ex.prefix}
                </button>`
            ).join("")}
        </div>
    `;
    
    inputSection.appendChild(exampleDiv);
    
    // Event handler for examples
    document.querySelectorAll(".example-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const ipv6 = e.target.dataset.ipv6;
            const prefix = e.target.dataset.prefix;
            
            document.getElementById("ipv6-address").value = ipv6;
            document.getElementById("prefix-length").value = prefix;
            
            // Auto-calculate
            setTimeout(() => {
                new IPv6Calculator().calculate();
            }, 100);
        });
        
        // Hover effect
        btn.addEventListener("mouseenter", (e) => {
            e.target.style.background = "#e2e8f0";
            e.target.style.borderColor = "#cbd5e1";
        });
        
        btn.addEventListener("mouseleave", (e) => {
            e.target.style.background = "#f1f5f9";
            e.target.style.borderColor = "#e2e8f0";
        });
    });
});

