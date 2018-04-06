// @flow

class Util {
    static sum(data, start=0, end=data.length) {
        data = data.slice(start, end);
        return data.reduce((x, y) => x+y, 0);
    }

    static joinSum(arr1, arr2) {
        let result = [];
        let len = Math.min(arr1.length, arr2.length);
        for (let i = 0; i < len; i++)
            result[i] = arr1[i] + arr2[i];
        return result;
    }

    static zip(arr1, arr2, fn) {
        fn = fn || ((x, y) => [x, y]);
        let result = [];
        let len = Math.min(arr1.length, arr2.length);
        for (let i = 0; i < len; i++)
            result[i] = fn(arr1[i], arr2[i]);
        return result;
    }

    //https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

class Stat {
    /*:: data: Array<number> */
    /*:: _frequencies: Array<number> */
    /*:: _classes:     Array<Array<number>> */
    /*:: _min:  number */
    /*:: _max:  number */
    /*:: _numClasses:  number */
    /*:: _length:  number */
    
    constructor(data=[]) { 
        this.data = data;
        this._frequencies = [];
        this._classes = [];

        this._min = -1;
        this._max = -1;
        this._numClasses = -1;
        this._length = -1;
    }

    min() {
        if (this._min >= 0)
            return this._min;
        return Math.min(...this.data);
    }

    max() {
        if (this._max >= 0)
            return this._max;
        return Math.max(...this.data);
    }

    range() {
        return this.max() - this.min();
    }

    length() {
        //return Util.sum(this.frequencies());
        if (this._length >= 0)
            return this._length;
        return this.data.length;
    }

    numClasses() {
        if (this._numClasses > 0)
            return this._numClasses;
        return Math.round(Math.sqrt(this.length()));
    }

    classSize() {
        return Math.round(this.range() / this.numClasses());
    }

    setClasses(min, max, numClasses) {
        this._min = min;
        this._max = max;
        this._numClasses = numClasses;
    }

    classes() /*: Array<Array<number>> */ {
        //if (this._classes.length > 0)
        //    return this._classes;


        let c = this.classSize();
        let ll = this.min();
        let result = [];

            console.log(this.min(), this.max());
        while (ll < this.max()) {
            let ul = ll+c - 1;
            result.push([ll, ul]);
            ll += c;
        }

        return result;
    }

    classLabels() {
        return this.classes().map(c => `${c[0]}−${c[1]}`);
    }

    setFrequencies(freqs) {
        this._frequencies = freqs;
    }

    frequencies() /*: Array<number> */ {
        if (this._frequencies.length > 0)
            return this._frequencies;

        let classes = this.classes();
        let inClass = (x, i) => {
            let c = classes[i];
            return c[0] <= x && x <= c[1];
        }
        let numClasses = this.numClasses();
        let freqs /*: Array<number>*/  = [];
        for (let x of this.data) {
            for (let i = 0; i < numClasses; i++) {
                if ( ! freqs[i])
                    freqs[i] = 0;
                if (inClass(x, i)) {
                    freqs[i]++;
                    break;
                }
            }
        }
        return freqs;
    }

    // CM
    classMarks() {
        let classes = this.classes();
        let marks /*: Array<number>*/ = [];
        this.classes().forEach(c => {
            marks.push((c[0] + c[1]) / 2);
        });
        return marks;
    }

    // cumulative frequency distribution
    lessThanCF() {
        let result = [];
        let frequencies = this.frequencies();

        for (let i = 0; i < this.numClasses(); i++) {
            result[i] = Util.sum(frequencies, 0, i+1);
        }
        return result;
    }

    greaterThanCF() {
        let result = [];
        let frequencies = this.frequencies();

        let n = this.numClasses();
        for (let i = n-1; i >= 0; i--) {
            result[i] = Util.sum(frequencies, i, n);
        }
        return result;
    }

    mean() {
        let freqs = this.frequencies()
        let marks = this.classMarks()
        let value = 0;
        for (let i = 0; i < this.numClasses(); i++) {
            console.log("mean row:", freqs[i] * marks[i]);
            value += freqs[i] * marks[i];
        }
        console.log("sum freqs", Util.sum(freqs), freqs);
        return value / Util.sum(freqs);
    }

    median() {
        let n = Util.sum(this.frequencies());
        let ltcf = this.lessThanCF();
        let classes = this.classes();
        let freqs = this.frequencies();
        let i = -1;
        ltcf.forEach((f, i_) => {
            if (f >= n/2 && i < 0)
                i = i_;

        });
        if (i < 0)
            return 0;
        let lcb = classes[i][0] - 0.5;
        let cfmdn = ltcf[i-1] || 0;

        return lcb + ((n/2 - cfmdn) / freqs[i] * this.classSize());
    }

    modalFrequency() {
        let freqs = this.frequencies();
        return Math.max(...freqs);
    }

    // fiMi
    frequencyMark() {
        let freqs = this.frequencies()
        let marks = this.classMarks()
        return Util.zip(freqs, marks).map(([f, m]) => f*m);
    }

    // (Mi - Mean)²
    markSubMeanSq() {
        let mean = this.mean();
        return this.classMarks().map(
            m => Math.pow(m - mean, 2)
        );
    }

    // f(Mi - Mean)²
    freqMarkSubMeanSq() {
        let freqs = this.frequencies()
        return this.markSubMeanSq().map((v, i) => v * freqs[i]);
    }

    sampleVariance() {
        let f = this.frequencies();
        let m = this.classMarks();
        let mean = this.mean();
        
        let sum = 0;
        for (let i = 0; i < this.numClasses(); i++) {
            sum += f[i] * Math.pow(m[i] - mean, 2);
        }
        return sum / (Util.sum(f)-1);
    }

    standardDeviation() {
        return Math.sqrt(this.sampleVariance());
    }

    coefficientOfVariation() {
        return 100 * (this.standardDeviation() / this.mean());
    }

    variationRatio() {
        return 1 - this.modalFrequency() / this.length();
    }

    applyComputation(name) {
        switch (name) {
            case "variance":
                return this.sampleVariance();
            case "SD":
                return this.standardDeviation();
            case "CV":
                return this.coefficientOfVariation();
            case "VR":
                return this.variationRatio();
            case "median":
                return this.median();
            case "mean":
                return this.mean();
            case "modalFreq":
                return this.modalFrequency();
        }
        return "";
    }

    apply(fn) {
        if (typeof fn == "object") {
            return fn[1](this);
        }

        switch (fn) {
            case "c":
            case "cs":
                return this.classLabels();
            case "f":
                return this.frequencies();
            case "cm":
                return this.classMarks();
            case "fcm":
                return this.frequencyMark();
            case "mixq":
                return this.markSubMeanSq();
            case "fmixq":
                return this.freqMarkSubMeanSq();
            case "m_x2":
                return this.markSubMeanSq();
            case "<cf":
                return this.lessThanCF();
            case ">cf":
                return this.greaterThanCF();
        }
        return [];
    }

    createTable(columns) {
        columns = columns || [ "c", "f", "cm", "<cf", ">cf"];
        let rows = [];
        let cols = columns.map(fn => {
            return this.apply(fn);
        });
        for (let i = 0; i < this.numClasses(); i++) {
            let row = cols.map(col => col[i]);
            rows.push(row);
        }
        return rows;
    }

    createHtmlTable(columns, footer=[]) {
        columns = columns || [ "c", "f", "cm", "<cf", ">cf"];
        let tableData = this.createTable(columns);

        let table = document.createElement("table");
        let thead = document.createElement("thead");
        let tbody = document.createElement("tbody");
        let tfoot = document.createElement("tfoot");

        let theadRow = document.createElement("tr");
        theadRow.innerHTML = columns.map(col => {
            if (typeof col == "object")
                col = col[0];
            return `<th>${Util.escapeHtml(col)}</th>`;
        }).join(" ");
        thead.appendChild(theadRow);

        for (let row of tableData) {
            let tr = document.createElement("tr");
            tr.innerHTML = row.map(x => `<td>${x}</td>`).join(" ");
            tbody.appendChild(tr);
        }
        let trSum = document.createElement("tr");
        let totalData = tableData.map(r=>r.slice(1)).reduce(
            Util.joinSum, 
            tableData[0].map(_=>0)
        );

        trSum.innerHTML = `<td>total</td>` + 
            totalData.map(x => `<td>${x}</td> `).join(" ");
        
        tbody.appendChild(trSum);

        tfoot.innerHTML = footer.map(name => `
            <tr>
            <td><strong>${Util.escapeHtml(name)}</strong></td>
            <td colspan="100">
                ${this.applyComputation(name)}
            </td>
            </tr>
        `).join(" ");

        table.appendChild(thead);
        table.appendChild(tbody);
        table.appendChild(tfoot);
        return table;
    }
}



let data = [
    201, 322, 453, 540, 124, 267, 390, 212,
    342, 486, 129, 583, 127, 653, 489, 175,
    649, 234, 568, 349, 389, 321, 680, 489,
    623, 650, 357, 695, 405, 276, 395, 203,
    458, 493, 145, 698, 340, 295, 601, 392,
]
let stat = new Stat(data);

//console.log(stat.data);
//console.log("number of classes:", stat.numClasses());
//console.log("range:", stat.range());
//console.log("class size:", stat.classSize());
//console.log("classes:\n", stat.classLabels());
//console.log("freqs:\n", stat.frequencies());
//console.log("class marks:\n", stat.classMarks());
//console.log("<CF", stat.lessThanCF());
//console.log("<CF", stat.greaterThanCF());
//
//console.log("<CF", stat.createTable());



