import { useEffect, useState } from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

import { vscodeApiWrapper } from "@webview-ui/utils/vscode";
import ApiOptions from "@webview-ui/components/settings/ApiOptions";
import { validateApiConfiguration } from "@webview-ui/utils/validate";
import { useExtensionState } from "@webview-ui/context/ExtensionStateContext";


function WelcomeView() {
  const { apiConfiguration } = useExtensionState();

  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined);

  const disableLetsGoButton = apiErrorMessage != null;

  const handleSubmit = () => {
    vscodeApiWrapper.postMessage({ type: "apiConfiguration", apiConfiguration });
  };

  useEffect(() => {
    setApiErrorMessage(validateApiConfiguration(apiConfiguration));
  }, [apiConfiguration]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, padding: "0 20px" }}>
      <h2>You can almost Recline.</h2>
      <p>Recline is an autonomous AI assistant that seamlessly integrates with your CLI and editor to create, edit, and run; redefining how you code.</p>

      <b>To get started; an AI provider needs to be configured.</b>

      <div style={{ marginTop: "10px" }}>
        <ApiOptions showModelOptions={false} />
        <VSCodeButton onClick={handleSubmit} disabled={disableLetsGoButton} style={{ marginTop: "3px" }}>
          Let's go!
        </VSCodeButton>
      </div>
    </div>
  );
}

export default WelcomeView;
