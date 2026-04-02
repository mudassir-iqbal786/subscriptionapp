export default function SettingsPage() {
    return (
        <s-page heading="Settings" inlineSize="large">
            <div className="settings-layout">
                <section className="settings-row">
                    <div className="settings-row__intro">
                        <h2>Billing attempts</h2>
                        <p>Control when billing attempts are made again after a failed attempt</p>
                    </div>

                    <div className="settings-panel">
                        <div className="settings-subpanel">
                            <h3>Payment method failure</h3>
                            <div className="settings-form-grid">
                                <label className="settings-field">
                                    <span>Number of retry attempts</span>
                                    <input defaultValue="3" type="text" />
                                    <small>Min 0, max 10 retries</small>
                                </label>
                                <label className="settings-field">
                                    <span>Days between payment retry attempts</span>
                                    <input defaultValue="7" type="text" />
                                    <small>Min 1, max 14 days</small>
                                </label>
                            </div>

                            <label className="settings-field">
                                <span>Action when all retry attempts have failed</span>
                                <select defaultValue="cancel">
                                    <option value="cancel">Cancel subscription and send notification</option>
                                    <option value="skip">Skip order and send notification</option>
                                </select>
                            </label>

                            <button className="settings-link-button" type="button">
                                Edit notifications
                            </button>
                        </div>

                        <div className="settings-subpanel">
                            <h3>Not enough inventory</h3>
                            <div className="settings-form-grid">
                                <label className="settings-field">
                                    <span>Number of retry attempts</span>
                                    <input defaultValue="5" type="text" />
                                    <small>Min 0, max 10 retries</small>
                                </label>
                                <label className="settings-field">
                                    <span>Days between payment retry attempts</span>
                                    <input defaultValue="1" type="text" />
                                    <small>Min 1, max 14 days</small>
                                </label>
                            </div>

                            <label className="settings-field">
                                <span>Action when all retry attempts have failed</span>
                                <select defaultValue="skip">
                                    <option value="skip">Skip order and send notification</option>
                                    <option value="cancel">Cancel subscription and send notification</option>
                                </select>
                            </label>

                            <label className="settings-field">
                                <span>Frequency of notifications to staff</span>
                                <select defaultValue="weekly">
                                    <option value="weekly">Weekly summary of billing failures</option>
                                    <option value="daily">Daily summary of billing failures</option>
                                </select>
                            </label>

                            <button className="settings-link-button" type="button">
                                Edit notifications
                            </button>
                        </div>
                    </div>
                </section>

                <section className="settings-row">
                    <div className="settings-row__intro">
                        <h2>Subscription widget</h2>
                    </div>

                    <div className="settings-panel settings-panel--compact">
                        <div className="settings-subpanel settings-subpanel--single">
                            <h3>Ensure subscriptions display on your store</h3>
                            <p>
                                Add the subscription widget to your product page and modify the styling and content to
                                match your store&apos;s theme. The subscription widget will only show on products that
                                can be sold as a subscription.
                            </p>
                            <button className="settings-link-button" type="button">
                                Learn more about theme integration and troubleshooting
                            </button>
                            <button className="settings-secondary-button" type="button">
                                Re-install widget
                            </button>
                        </div>
                    </div>
                </section>

                <section className="settings-row">
                    <div className="settings-row__intro">
                        <h2>Subscription management URL</h2>
                    </div>

                    <div className="settings-panel settings-panel--compact">
                        <div className="settings-subpanel settings-subpanel--single">
                            <h3>Add the subscription management URL to your navigation</h3>
                            <p>
                                Add the subscription management URL anywhere you&apos;d like to give customers an entry
                                point to the subscription management page. Learn more about customer account settings
                            </p>

                            <div className="settings-url-box">
                                <span>
                                    https://shopify.com/76929400103/1/account/pages/6971b1a1-27f6-4c27-b8b0-3009fd3b921d
                                </span>
                                <button className="settings-link-button" type="button">
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="settings-row">
                    <div className="settings-row__intro">
                        <h2>Subscription notifications</h2>
                    </div>

                    <div className="settings-panel settings-panel--compact">
                        <div className="settings-subpanel settings-subpanel--single">
                            <h3>Customize notifications</h3>
                            <p>
                                Modify your emails in the subscription section to create unique communication for you and
                                your customers. Decide which subscription notification emails you want to receive and
                                which ones you want to send to your customers.
                            </p>
                            <button className="settings-secondary-button" type="button">
                                View notifications
                            </button>
                        </div>
                    </div>
                </section>

                <div className="settings-save-bar">
                    <button className="settings-save-button" type="button">
                        Save
                    </button>
                </div>
            </div>
        </s-page>
    );
}
