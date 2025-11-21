const vscode = acquireVsCodeApi();


const customOptions = document.getElementById('custom-options');
const radios = document.getElementsByName('serialization');

radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customOptions.classList.remove('hidden');
        } else {
            customOptions.classList.add('hidden');
        }
    });
});

// Load State
const previousState = vscode.getState();
const initialSettings = window.initialSettings;
const initialClassName = window.initialClassName;

if (initialClassName) {
    document.getElementById('class-name').value = initialClassName;
}

if (previousState && previousState.json) {
    document.getElementById('json-input').value = previousState.json;
}

if (initialSettings) {

    if (initialSettings.serialization) {
        const radio = document.querySelector(`input[name="serialization"][value="${initialSettings.serialization}"]`);
        if (radio) radio.checked = true;
        if (initialSettings.serialization === 'custom') {
            customOptions.classList.remove('hidden');
        }
    }
    if (initialSettings.typeSetting) {
        const radio = document.querySelector(`input[name="type-setting"][value="${initialSettings.typeSetting}"]`);
        if (radio) radio.checked = true;
    }
    if (initialSettings.defaultValue) {
        const radio = document.querySelector(`input[name="default-value"][value="${initialSettings.defaultValue}"]`);
        if (radio) radio.checked = true;
    }
    if (initialSettings.namingConvention) {
        const radio = document.querySelector(`input[name="naming-convention"][value="${initialSettings.namingConvention}"]`);
        if (radio) radio.checked = true;
    }
    if (initialSettings.sort) {
        document.getElementById('sort-properties').checked = true;
    }
    if (initialSettings.useJsonAnnotation) {
        document.getElementById('use-json-annotation').checked = true;
    }
    if (initialSettings.customSettings) {
        document.getElementById('import-stmt').value = initialSettings.customSettings.import || '';
        document.getElementById('class-annotation').value = initialSettings.customSettings.classAnnotation || '';
        document.getElementById('property-annotation').value = initialSettings.customSettings.propertyAnnotation || '';
    }
}

const generateBtn = document.getElementById('generate-btn');
const classNameInput = document.getElementById('class-name');
const jsonInput = document.getElementById('json-input');

// Advanced Settings Modal
const modal = document.getElementById('advanced-modal');
const advancedBtn = document.getElementById('advanced-btn');
const closeBtn = document.getElementsByClassName('close-btn')[0];

advancedBtn.onclick = function () {
    modal.classList.remove('hidden');
}

closeBtn.onclick = function () {
    modal.classList.add('hidden');
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.classList.add('hidden');
    }
}

// Validation
function isValidDartClassName(name) {

    const dartIdentifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return dartIdentifierRegex.test(name);
}

function validateInputs() {
    const className = classNameInput.value.trim();
    const json = jsonInput.value.trim();
    let isValidJson = false;
    let isValidClassName = false;

    // Validate JSON
    try {
        if (json) {
            JSON.parse(json);
            isValidJson = true;
        }
    } catch (e) {
        isValidJson = false;
    }

    // Validate class name
    if (className && isValidDartClassName(className)) {
        isValidClassName = true;
        classNameInput.style.borderColor = '';
    } else if (className) {
        isValidClassName = false;
        classNameInput.style.borderColor = '#f48771';
    } else {
        classNameInput.style.borderColor = '';
    }

    if (isValidClassName && isValidJson) {
        generateBtn.disabled = false;
    } else {
        generateBtn.disabled = true;
    }
}

classNameInput.addEventListener('input', validateInputs);
jsonInput.addEventListener('input', validateInputs);


validateInputs();

document.getElementById('generate-btn').addEventListener('click', () => {
    const className = document.getElementById('class-name').value;
    const json = document.getElementById('json-input').value;
    const serialization = document.querySelector('input[name="serialization"]:checked').value;
    const typeSetting = document.querySelector('input[name="type-setting"]:checked').value;
    const defaultValue = document.querySelector('input[name="default-value"]:checked').value;
    const namingConvention = document.querySelector('input[name="naming-convention"]:checked').value;
    const sort = document.getElementById('sort-properties').checked;
    const useJsonAnnotation = document.getElementById('use-json-annotation').checked;

    const customSettings = {
        import: document.getElementById('import-stmt').value,
        classAnnotation: document.getElementById('class-annotation').value,
        propertyAnnotation: document.getElementById('property-annotation').value
    };

    // Save State
    vscode.setState({ json });

    vscode.postMessage({
        command: 'generate',
        data: {
            className,
            json,
            serialization,
            typeSetting,
            defaultValue,
            namingConvention,
            sort,
            useJsonAnnotation,
            customSettings
        }
    });
});
