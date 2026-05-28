import { useState, useEffect } from 'react'

const KEY = 'realdraft_settings'

export const DEFAULT_SETTINGS = {
  agentName:      '',
  licenseNumber:  '',
  brokerage:      '',
  brokerLicense:  '',
  brokerAddress:  '',
  brokerPhone:    '',
  brokerFax:      '',
  agentEmail:     '',
  agentPhone:     '',
  agentCell:      '',
  smtpUser:       '',
  smtpPass:       '',
  signingOrder:   'buyer_first',
  esignProvider:  'hellosign',
}

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

/** React hook — returns [settings, setSettings]. Persists to localStorage. */
export function useSettings() {
  const [settings, setSettingsState] = useState(loadSettings)

  const setSettings = (updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      saveSettings(next)
      return next
    })
  }

  return [settings, setSettings]
}

/** Convert stored settings → offerData agent fields for PDF / scripts */
export function agentFieldsFromSettings(settings) {
  return {
    agent_name:     settings.agentName,
    agent_license:  settings.licenseNumber,
    agent_phone:    settings.agentPhone,
    agent_cell:     settings.agentCell,
    agent_email:    settings.agentEmail,
    broker_name:    settings.brokerage,
    broker_license: settings.brokerLicense,
    broker_address: settings.brokerAddress,
    broker_phone:   settings.brokerPhone,
    broker_fax:     settings.brokerFax,
  }
}
