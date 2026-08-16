const UNIT = 1_000_000n
const RESOURCE_BASE = 4_000_000_000_000n
const RESOURCE_CAP = 12_000_000_000_000n
const STABILITY_CAP = 10_000_000_000_000n
const DOOM_CAP = 1_000_000_000_000n
const COOLDOWN_TICKS = 300
const COOLDOWN_SEGMENT_TICKS = 30
const SIMULATION_GATE = 10

const resourceMeta = [
  { key: "food", name: "粮食", caption: "人口与补给", add: 18_000_000n, drain: 24_000_000n },
  { key: "industry", name: "工业", caption: "生产与恢复", add: 10_000_000n, drain: 14_000_000n },
  { key: "tech", name: "科研", caption: "跃迁与救援", add: 7_000_000n, drain: 8_000_000n },
  { key: "military", name: "军备", caption: "强制统一", add: 6_000_000n, drain: 12_000_000n },
  { key: "culture", name: "文化", caption: "和平整合", add: 6_000_000n, drain: 8_000_000n }
]

const chineseNames = {
  BRA: "巴西", CAN: "加拿大", IND: "印度", JPN: "日本", EGY: "埃及", CHN: "中国", USA: "美国",
  GBR: "英国", FRA: "法国", DEU: "德国", AUS: "澳大利亚", ZAF: "南非", ARG: "阿根廷", URY: "乌拉圭",
  MEX: "墨西哥", IDN: "印度尼西亚", SAU: "沙特阿拉伯", TUR: "土耳其", ITA: "意大利", ESP: "西班牙",
  RUS: "俄罗斯", KOR: "韩国", NOR: "挪威", SWE: "瑞典", FIN: "芬兰", NZL: "新西兰", NGA: "尼日利亚"
}

const eventDefinitions = [
  {
    id: "agriculture",
    name: "农业革命",
    requiredTicks: 30,
    segmentTicks: 3,
    condition(country) {
      return country.resources.food >= 7_500_000_000_000n * country.scale &&
        country.resources.tech >= 4_000_000_000_000n * country.scale &&
        country.stability >= 6_000_000_000_000n * country.scale
    },
    effect(country) {
      country.resources.food = safeSubtract(country.resources.food, 2_000_000_000_000n * country.scale)
      country.population += 500_000_000n * country.scale
      country.bonuses.food += 500_000_000_000n * country.scale
      country.positive = "农业革命完成"
      country.positiveEffect = "粮食常态目标永久增加 500,000,000,000"
    }
  },
  {
    id: "industry",
    name: "工业革命",
    requiredTicks: 40,
    segmentTicks: 4,
    condition(country) {
      return country.resources.industry >= 8_000_000_000_000n * country.scale &&
        country.resources.tech >= 6_000_000_000_000n * country.scale &&
        country.resources.food >= 5_500_000_000_000n * country.scale &&
        country.stability >= 6_000_000_000_000n * country.scale
    },
    effect(country) {
      country.resources.industry = safeSubtract(country.resources.industry, 2_500_000_000_000n * country.scale)
      country.bonuses.industry += 500_000_000_000n * country.scale
      country.positive = "工业革命完成"
      country.positiveEffect = "工业常态目标永久增加 500,000,000,000"
      world.doom = clampBig(world.doom + 5_000_000_000n, 0n, DOOM_CAP)
    }
  },
  {
    id: "information",
    name: "信息革命",
    requiredTicks: 50,
    segmentTicks: 5,
    condition(country) {
      return country.resources.tech >= 9_000_000_000_000n * country.scale &&
        country.resources.industry >= 7_000_000_000_000n * country.scale &&
        country.resources.culture >= 6_500_000_000_000n * country.scale &&
        country.stability >= 7_000_000_000_000n * country.scale
    },
    effect(country) {
      country.resources.tech = safeSubtract(country.resources.tech, 3_000_000_000_000n * country.scale)
      country.bonuses.tech += 1_000_000_000_000n * country.scale
      country.informationBonus = true
      country.positive = "信息革命完成"
      country.positiveEffect = "国家实力永久获得科研加成"
    }
  },
  {
    id: "green",
    name: "绿色转型",
    requiredTicks: 60,
    segmentTicks: 6,
    condition(country) {
      return country.resources.tech >= 9_000_000_000_000n * country.scale &&
        country.resources.industry >= 7_500_000_000_000n * country.scale &&
        country.resources.culture >= 8_500_000_000_000n * country.scale &&
        world.doom >= 300_000_000_000n
    },
    effect(country) {
      country.resources.industry = safeSubtract(country.resources.industry, 2_000_000_000_000n * country.scale)
      country.resources.culture = safeSubtract(country.resources.culture, 1_500_000_000_000n * country.scale)
      world.doom = safeSubtract(world.doom, 50_000_000_000n)
      country.positive = "绿色转型完成"
      country.positiveEffect = "全球毁灭度减少 50,000,000,000"
    }
  }
]

const elements = {
  headline: document.querySelector("#headline"),
  worldLine: document.querySelector("#world-line"),
  worldTime: document.querySelector("#world-time"),
  ranking: document.querySelector("#ranking-list"),
  countryName: document.querySelector("#country-name"),
  countryOwner: document.querySelector("#country-owner"),
  countryRank: document.querySelector("#country-rank"),
  population: document.querySelector("#country-population"),
  stability: document.querySelector("#country-stability"),
  power: document.querySelector("#country-power"),
  resourceMeters: document.querySelector("#resource-meters"),
  positiveProject: document.querySelector("#positive-project"),
  positiveEffect: document.querySelector("#positive-effect"),
  negativeProject: document.querySelector("#negative-project"),
  negativeEffect: document.querySelector("#negative-effect"),
  mapCountryName: document.querySelector("#map-country-name"),
  shortageHint: document.querySelector("#shortage-hint"),
  mapEffects: document.querySelector("#map-effects"),
  impactToast: document.querySelector("#impact-toast"),
  countrySearch: document.querySelector("#country-search"),
  countryOptions: document.querySelector("#country-options"),
  materialOptions: document.querySelector("#material-options"),
  quantityInput: document.querySelector("#quantity-input"),
  quantityMinus: document.querySelector("#quantity-minus"),
  quantityPlus: document.querySelector("#quantity-plus"),
  impactPreview: document.querySelector("#impact-preview"),
  impactResource: document.querySelector("#impact-resource"),
  supportButton: document.querySelector("#support-button"),
  supportTarget: document.querySelector("#support-target"),
  cooldownLabel: document.querySelector("#cooldown-label"),
  cooldownSegments: document.querySelector("#cooldown-segments"),
  cooldownTime: document.querySelector("#cooldown-time"),
  eventName: document.querySelector("#event-name"),
  eventCondition: document.querySelector("#event-condition"),
  eventProgress: document.querySelector("#event-progress"),
  eventProgressLabel: document.querySelector("#event-progress-label"),
  integrationName: document.querySelector("#integration-name"),
  integrationState: document.querySelector("#integration-state"),
  integrationProgress: document.querySelector("#integration-progress"),
  integrationProgressLabel: document.querySelector("#integration-progress-label"),
  doomValue: document.querySelector("#doom-value"),
  doomProgress: document.querySelector("#doom-progress"),
  doomState: document.querySelector("#doom-state"),
  historyList: document.querySelector("#history-list"),
  debugToggle: document.querySelector("#debug-toggle"),
  debugPanel: document.querySelector("#debug-panel"),
  debugClose: document.querySelector("#debug-close"),
  speedControls: document.querySelector("#speed-controls"),
  debugResource: document.querySelector("#debug-resource"),
  debugAmount: document.querySelector("#debug-amount"),
  endingOverlay: document.querySelector("#ending-overlay"),
  endingKicker: document.querySelector("#ending-kicker"),
  endingTitle: document.querySelector("#ending-title"),
  endingCopy: document.querySelector("#ending-copy"),
  endingCountdown: document.querySelector("#ending-countdown")
}

const mapPaths = Array.from(document.querySelectorAll("#map-countries path"))
const countries = new Map()
const pathByIso = new Map()
const numberFormatter = new Intl.NumberFormat("en-US")

const world = {
  line: 7,
  year: 42,
  month: 1,
  day: 1,
  hour: 0,
  doom: 50_000_000_000n,
  speed: 1,
  simulationAccumulator: 0,
  uiAccumulator: 0,
  cooldownRemaining: 0,
  selectedIso: "BRA",
  selectedResource: "tech",
  integration: null,
  history: [],
  ending: false
}

function hashIso(iso) {
  let hash = 17
  for (const char of iso) hash = hash * 31 + char.charCodeAt(0)
  return Math.abs(hash)
}

function clampBig(value, minimum, maximum) {
  if (value < minimum) return minimum
  if (value > maximum) return maximum
  return value
}

function safeSubtract(value, amount) {
  if (value <= amount) return 0n
  return value - amount
}

function formatBig(value) {
  return numberFormatter.format(value)
}

function formatClock() {
  const month = String(world.month).padStart(2, "0")
  const day = String(world.day).padStart(2, "0")
  const hour = String(world.hour).padStart(2, "0")
  return `${world.year}年 ${month}月 ${day}日 ${hour}时`
}

function countryName(iso, fallback) {
  return chineseNames[iso] || fallback || iso
}

function initializeCountries() {
  countries.clear()
  pathByIso.clear()
  for (const path of mapPaths) {
    const iso = path.dataset.iso
    const seed = hashIso(iso)
    const scaleValues = [1n, 2n, 4n, 8n]
    const scale = scaleValues[seed % 4]
    const base = 3_200n + BigInt(seed % 2_600)
    const second = 3_350n + BigInt(seed % 2_300)
    const third = 3_100n + BigInt(seed % 2_700)
    const fourth = 3_450n + BigInt(seed % 2_450)
    const fifth = 3_250n + BigInt(seed % 2_550)
    const name = countryName(iso, path.getAttribute("aria-label"))
    const country = {
      iso,
      name,
      scale,
      owner: iso,
      resources: {
        food: base * 1_000_000_000n * scale,
        industry: second * 1_000_000_000n * scale,
        tech: third * 1_000_000_000n * scale,
        military: fourth * 1_000_000_000n * scale,
        culture: fifth * 1_000_000_000n * scale
      },
      population: (24_000n + BigInt(seed % 18_000)) * 1_000_000n * scale,
      stability: (4_500n + BigInt(seed % 2_000)) * 1_000_000_000n * scale,
      bonuses: { food: 0n, industry: 0n, tech: 0n, military: 0n, culture: 0n },
      eventProgress: { agriculture: 0, industry: 0, information: 0, green: 0 },
      completedEvents: new Set(),
      informationBonus: false,
      positive: "基础生产恢复",
      positiveEffect: "低位资源正在自动回升",
      negative: "资源自然衰减",
      negativeEffect: "高位资源会持续消耗"
    }
    countries.set(iso, country)
    pathByIso.set(iso, path)
  }

  const brazil = countries.get("BRA")
  if (brazil) {
    brazil.resources.food = 7_800_000_000_000n * brazil.scale
    brazil.resources.tech = 4_300_000_000_000n * brazil.scale
    brazil.stability = 6_400_000_000_000n * brazil.scale
  }

  populateCountrySearch()
  startInitialIntegration()
}

function targetFor(country, key) {
  return RESOURCE_BASE * country.scale + country.bonuses[key]
}

function capFor(country) {
  return RESOURCE_CAP * country.scale
}

function stabilityCapFor(country) {
  return STABILITY_CAP * country.scale
}

function countryPower(country) {
  let power = 40n * country.resources.military + 25n * country.resources.industry + 20n * country.resources.tech + 15n * country.stability
  if (country.informationBonus) power += 5n * country.resources.tech
  return power
}

function controlledCount(country) {
  let count = 0n
  for (const item of countries.values()) if (item.owner === country.owner) count += 1n
  return count
}

function rankingScore(country) {
  return countryPower(country) + country.population * 100n + controlledCount(country) * 2_000_000_000_000_000n
}

function dominantResource(country) {
  let dominant = resourceMeta[0]
  for (const meta of resourceMeta) {
    if (country.resources[meta.key] > country.resources[dominant.key]) dominant = meta
  }
  return dominant.key
}

function shortageResource(country) {
  let shortage = resourceMeta[0]
  for (const meta of resourceMeta) {
    if (country.resources[meta.key] < country.resources[shortage.key]) shortage = meta
  }
  return shortage
}

function populateCountrySearch() {
  const sorted = Array.from(countries.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
  elements.countryOptions.textContent = ""
  for (const country of sorted) {
    const option = document.createElement("option")
    option.value = country.name
    elements.countryOptions.append(option)
  }
}

function selectCountry(iso) {
  if (!countries.has(iso)) return
  world.selectedIso = iso
  const country = countries.get(iso)
  elements.countrySearch.value = country.name
  elements.supportTarget.textContent = `支持${country.name}`
  for (const path of mapPaths) path.classList.toggle("is-selected", path.dataset.iso === iso)
  renderAll()
}

function buildMaterialButtons() {
  elements.materialOptions.textContent = ""
  elements.debugResource.textContent = ""
  for (const meta of resourceMeta) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = `material-button material-${meta.key}`
    button.dataset.resource = meta.key
    button.innerHTML = `<i aria-hidden="true"></i><div><strong>${meta.name}</strong><span>${meta.caption}</span></div>`
    button.addEventListener("click", () => selectResource(meta.key))
    elements.materialOptions.append(button)

    const option = document.createElement("option")
    option.value = meta.key
    option.textContent = meta.name
    elements.debugResource.append(option)
  }
  elements.debugResource.value = world.selectedResource
  selectResource(world.selectedResource)
}

function selectResource(key) {
  if (!resourceMeta.some(meta => meta.key === key)) return
  world.selectedResource = key
  for (const button of elements.materialOptions.querySelectorAll("button")) button.classList.toggle("is-selected", button.dataset.resource === key)
  updateImpactPreview()
}

function clampQuantity() {
  let quantity = Number.parseInt(elements.quantityInput.value, 10)
  if (!Number.isFinite(quantity)) quantity = 1
  if (quantity < 1) quantity = 1
  if (quantity > 100) quantity = 100
  elements.quantityInput.value = String(quantity)
  return quantity
}

function updateImpactPreview() {
  const quantity = clampQuantity()
  const amount = BigInt(quantity) * UNIT
  const meta = resourceMeta.find(item => item.key === world.selectedResource)
  elements.impactPreview.textContent = formatBig(amount)
  elements.impactResource.textContent = meta.name
}

function makeSegments(container) {
  container.textContent = ""
  for (let index = 0; index < 10; index += 1) container.append(document.createElement("i"))
}

function setSegments(container, activeCount) {
  const segments = container.querySelectorAll("i")
  segments.forEach((segment, index) => segment.classList.toggle("is-active", index < activeCount))
}

function activeBigSegments(value, step) {
  let active = 0
  for (let index = 1; index <= 10; index += 1) if (value >= step * BigInt(index)) active = index
  return active
}

function activeNumberSegments(value, step) {
  let active = 0
  for (let index = 1; index <= 10; index += 1) if (value >= step * index) active = index
  return active
}

function renderResourceMeters(country, bumpedKey) {
  elements.resourceMeters.textContent = ""
  for (const meta of resourceMeta) {
    const wrapper = document.createElement("div")
    wrapper.className = `resource-meter resource-${meta.key}`
    if (meta.key === bumpedKey) wrapper.classList.add("is-bumped")
    const header = document.createElement("header")
    const label = document.createElement("span")
    label.textContent = meta.name
    const value = document.createElement("strong")
    value.textContent = formatBig(country.resources[meta.key])
    header.append(label, value)
    const track = document.createElement("div")
    track.className = "mini-track"
    makeSegments(track)
    setSegments(track, activeBigSegments(country.resources[meta.key], 1_200_000_000_000n * country.scale))
    wrapper.append(header, track)
    elements.resourceMeters.append(wrapper)
  }
}

function currentEvent(country) {
  for (const definition of eventDefinitions) if (!country.completedEvents.has(definition.id)) return definition
  return eventDefinitions[eventDefinitions.length - 1]
}

function renderCountry(bumpedKey) {
  const country = countries.get(world.selectedIso)
  if (!country) return
  const ranking = sortedCountries()
  const rank = ranking.findIndex(item => item.iso === country.iso) + 1
  elements.countryName.textContent = country.name
  elements.mapCountryName.textContent = country.name
  elements.countryOwner.textContent = country.owner === country.iso ? "独立国家" : `已归属 ${countries.get(country.owner)?.name || country.owner}`
  elements.countryRank.textContent = `#${String(rank).padStart(2, "0")}`
  elements.population.textContent = formatBig(country.population)
  elements.stability.textContent = formatBig(country.stability)
  elements.power.textContent = formatBig(countryPower(country))
  elements.positiveProject.textContent = country.positive
  elements.positiveEffect.textContent = country.positiveEffect
  elements.negativeProject.textContent = country.negative
  elements.negativeEffect.textContent = country.negativeEffect
  const shortage = shortageResource(country)
  elements.shortageHint.textContent = `${shortage.name}储备最低 · 建议关注`
  elements.supportTarget.textContent = `支持${country.name}`
  renderResourceMeters(country, bumpedKey)
}

function sortedCountries() {
  return Array.from(countries.values()).sort((a, b) => {
    const left = rankingScore(a)
    const right = rankingScore(b)
    if (left === right) return a.name.localeCompare(b.name, "zh-CN")
    return left > right ? -1 : 1
  })
}

function renderRanking() {
  const ranking = sortedCountries().slice(0, 8)
  elements.ranking.textContent = ""
  ranking.forEach((country, index) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "ranking-row"
    if (country.iso === world.selectedIso) button.classList.add("is-selected")
    button.innerHTML = `<span class="ranking-index">${String(index + 1).padStart(2, "0")}</span><strong>${country.name}</strong><em>${formatBig(rankingScore(country))}</em>`
    button.addEventListener("click", () => selectCountry(country.iso))
    elements.ranking.append(button)
  })
}

function renderMap() {
  for (const path of mapPaths) {
    const country = countries.get(path.dataset.iso)
    if (!country) continue
    path.setAttribute("fill", `url(#pattern-${dominantResource(country)})`)
    path.classList.toggle("is-selected", country.iso === world.selectedIso)
  }
}

function renderEventProgress() {
  const country = countries.get(world.selectedIso)
  if (!country) return
  const event = currentEvent(country)
  const progress = country.eventProgress[event.id]
  elements.eventName.textContent = event.name
  elements.eventCondition.textContent = event.condition(country) ? "全部资源门槛已满足，连续计时中" : "关键资源尚未同时达到门槛"
  elements.eventProgressLabel.textContent = `连续保持 ${formatBig(BigInt(progress))} 游戏小时`
  setSegments(elements.eventProgress, activeNumberSegments(progress, event.segmentTicks))
}

function renderIntegration() {
  const integration = world.integration
  if (!integration) {
    elements.integrationName.textContent = "暂无整合"
    elements.integrationState.textContent = "国家仍在积累统一条件"
    elements.integrationProgressLabel.textContent = "等待新的临界事件"
    setSegments(elements.integrationProgress, 0)
    return
  }
  const from = countries.get(integration.from)
  const to = countries.get(integration.to)
  elements.integrationName.textContent = `${from.name} → ${to.name}`
  elements.integrationState.textContent = integration.paused ? "目标地区稳定不足，进程暂停" : integration.type === "peace" ? "和平整合正在推进" : "强制整合正在推进"
  elements.integrationProgressLabel.textContent = `整合进度 ${formatBig(integration.progress)} · 目标 ${formatBig(integration.target)}`
  setSegments(elements.integrationProgress, activeBigSegments(integration.progress, integration.segmentStep))
}

function renderDoom() {
  elements.doomValue.textContent = formatBig(world.doom)
  setSegments(elements.doomProgress, activeBigSegments(world.doom, 100_000_000_000n))
  if (world.doom >= 900_000_000_000n) elements.doomState.textContent = "终局风险：生态链可能断裂"
  else if (world.doom >= 750_000_000_000n) elements.doomState.textContent = "极高风险：全球灾难事件已解锁"
  else if (world.doom >= 500_000_000_000n) elements.doomState.textContent = "高风险：严重灾难概率上升"
  else elements.doomState.textContent = "全球风险处于可控范围"
}

function renderClock() {
  elements.worldLine.textContent = `世界线 ${String(world.line).padStart(4, "0")}`
  elements.worldTime.textContent = formatClock()
}

function renderCooldown() {
  const elapsed = COOLDOWN_TICKS - world.cooldownRemaining
  setSegments(elements.cooldownSegments, activeNumberSegments(elapsed, COOLDOWN_SEGMENT_TICKS))
  if (world.cooldownRemaining <= 0) {
    elements.cooldownLabel.textContent = "投放已就绪"
    elements.cooldownTime.textContent = "READY"
    elements.supportButton.disabled = false
  } else {
    const displayTicks = Math.ceil(world.cooldownRemaining * 0.1)
    elements.cooldownLabel.textContent = "投放冷却中"
    elements.cooldownTime.textContent = `${displayTicks}s`
    elements.supportButton.disabled = true
  }
}

function renderHistory() {
  elements.historyList.textContent = ""
  for (const item of world.history.slice(0, 8)) {
    const row = document.createElement("li")
    if (item.kind) row.classList.add(`is-${item.kind}`)
    const time = document.createElement("time")
    time.textContent = item.time
    const detail = document.createElement("div")
    const title = document.createElement("strong")
    title.textContent = item.title
    const copy = document.createElement("span")
    copy.textContent = item.copy
    detail.append(title, copy)
    row.append(time, detail)
    elements.historyList.append(row)
  }
}

function renderAll(bumpedKey) {
  renderClock()
  renderRanking()
  renderCountry(bumpedKey)
  renderMap()
  renderEventProgress()
  renderIntegration()
  renderDoom()
  renderCooldown()
  renderHistory()
}

function addHistory(title, copy, kind = "") {
  world.history.unshift({ time: `${String(world.month).padStart(2, "0")}.${String(world.day).padStart(2, "0")} ${String(world.hour).padStart(2, "0")}时`, title, copy, kind })
  if (world.history.length > 20) world.history.length = 20
  renderHistory()
}

function setHeadline(text) {
  elements.headline.textContent = text
  elements.headline.classList.remove("news-refresh")
  requestAnimationFrame(() => elements.headline.classList.add("news-refresh"))
}

function showToast(title, copy) {
  elements.impactToast.innerHTML = `<strong>${title}</strong><span>${copy}</span>`
  elements.impactToast.hidden = false
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => { elements.impactToast.hidden = true }, 3200)
}

function mapPulse(iso) {
  const path = pathByIso.get(iso)
  if (!path) return
  const box = path.getBBox()
  const x = box.x + box.width * 0.5
  const y = box.y + box.height * 0.5
  elements.mapEffects.innerHTML = `<circle class="map-pulse" cx="${x}" cy="${y}" r="4"></circle><circle class="map-impact-core" cx="${x}" cy="${y}" r="8"></circle>`
}

function launchParticle(iso) {
  const buttonBox = elements.supportButton.getBoundingClientRect()
  const mapBox = document.querySelector("#world-map").getBoundingClientRect()
  const path = pathByIso.get(iso)
  if (!path) return
  const pathBox = path.getBoundingClientRect()
  const particle = document.createElement("span")
  particle.className = "supply-particle"
  particle.style.setProperty("--start-x", `${buttonBox.left + buttonBox.width * 0.5}px`)
  particle.style.setProperty("--start-y", `${buttonBox.top + buttonBox.height * 0.5}px`)
  particle.style.setProperty("--end-x", `${pathBox.left + pathBox.width * 0.5}px`)
  particle.style.setProperty("--end-y", `${pathBox.top + pathBox.height * 0.5}px`)
  if (mapBox.width > 0) document.body.append(particle)
  window.setTimeout(() => particle.remove(), 900)
}

function handleSupport() {
  if (world.cooldownRemaining > 0 || world.ending) return
  const country = countries.get(world.selectedIso)
  const quantity = clampQuantity()
  const amount = BigInt(quantity) * UNIT
  const event = currentEvent(country)
  const eligibleBefore = event.condition(country)
  country.resources[world.selectedResource] = clampBig(country.resources[world.selectedResource] + amount, 0n, capFor(country))
  const eligibleAfter = event.condition(country)
  world.cooldownRemaining = COOLDOWN_TICKS
  const meta = resourceMeta.find(item => item.key === world.selectedResource)
  launchParticle(country.iso)
  window.setTimeout(() => mapPulse(country.iso), 620)
  setHeadline(`${country.name}收到${formatBig(amount)}点${meta.name}，资源状态已实时更新`)
  showToast("投放立即生效", `${country.name} · ${meta.name} +${formatBig(amount)}`)
  if (!eligibleBefore && eligibleAfter) {
    addHistory(`${country.name}跨过${event.name}门槛`, `最后一份${meta.name}使全部条件成立，连续计时开始`, "major")
  }
  renderAll(world.selectedResource)
}

function advanceClock() {
  world.hour += 1
  if (world.hour >= 24) {
    world.hour = 0
    world.day += 1
  }
  if (world.day > 30) {
    world.day = 1
    world.month += 1
  }
  if (world.month > 12) {
    world.month = 1
    world.year += 1
  }
}

function adjustResource(country, meta) {
  const target = targetFor(country, meta.key)
  const scale = country.scale
  if (meta.key === "military") {
    if (country.resources.military < target && country.resources.industry >= targetFor(country, "industry")) country.resources.military += meta.add * scale
    else country.resources.military = safeSubtract(country.resources.military, meta.drain * scale)
  } else if (meta.key === "culture") {
    if (country.resources.culture < target && country.stability >= 5_000_000_000_000n * scale) country.resources.culture += meta.add * scale
    else country.resources.culture = safeSubtract(country.resources.culture, meta.drain * scale)
  } else if (country.resources[meta.key] < target) {
    country.resources[meta.key] += meta.add * scale
  } else {
    country.resources[meta.key] = safeSubtract(country.resources[meta.key], meta.drain * scale)
  }
  country.resources[meta.key] = clampBig(country.resources[meta.key], 0n, capFor(country))
}

function adjustCountry(country) {
  for (const meta of resourceMeta) adjustResource(country, meta)
  const scale = country.scale
  const stableResources = country.resources.food >= targetFor(country, "food") && country.resources.industry >= targetFor(country, "industry") && country.resources.culture >= targetFor(country, "culture")
  if (stableResources) country.stability += 20_000_000n * scale
  if (country.resources.food < 1_500_000_000_000n * scale) country.stability = safeSubtract(country.stability, 60_000_000n * scale)
  if (world.integration && world.integration.to === country.iso) country.stability = safeSubtract(country.stability, 40_000_000n * scale)
  country.stability = clampBig(country.stability, 0n, stabilityCapFor(country))

  if (country.resources.food >= targetFor(country, "food") && country.stability >= 5_000_000_000_000n * scale) country.population += 1_000_000n * scale
  if (country.resources.food < 1_500_000_000_000n * scale) country.population = safeSubtract(country.population, 30_000_000n * scale)
  if (country.resources.food < 500_000_000_000n * scale) country.population = safeSubtract(country.population, 120_000_000n * scale)
}

function checkCountryEvents(country) {
  const event = currentEvent(country)
  if (country.completedEvents.has(event.id)) return
  if (event.condition(country)) country.eventProgress[event.id] += 1
  else country.eventProgress[event.id] = 0
  if (country.eventProgress[event.id] >= event.requiredTicks) triggerHistoricalEvent(country, event)
}

function triggerHistoricalEvent(country, event, debug = false) {
  event.effect(country)
  country.completedEvents.add(event.id)
  country.eventProgress[event.id] = event.requiredTicks
  const kind = debug ? "debug" : "major"
  addHistory(`${country.name}触发${event.name}`, debug ? "调试操作直接触发了历史事件" : "长期资源积累完成国家级质变", kind)
  setHeadline(`${country.name}完成${event.name}，世界力量格局正在变化`)
  mapPulse(country.iso)
}

function randomCountryEvent() {
  if (world.hour !== 0) return
  for (const country of countries.values()) {
    if (Math.random() >= 0.0012) continue
    const roll = Math.floor(Math.random() * 1_000)
    if (roll < 250) applyDisaster(country, "干旱", "food", 600_000_000_000n, 100_000_000_000n)
    else if (roll < 450) applyDisaster(country, "地震", "industry", 500_000_000_000n, 250_000_000_000n)
    else if (roll < 650) applyDisaster(country, "洪水", "food", 350_000_000_000n, 180_000_000_000n)
    else if (roll < 800) applyDisaster(country, "疫病", "culture", 300_000_000_000n, 600_000_000_000n)
    else if (roll < 900) applyDiscovery(country)
    else if (roll < 970) applyBreakthrough(country)
    else applyGreatPerson(country)
  }
}

function applyDisaster(country, name, resourceKey, resourceLoss, stabilityLoss, debug = false) {
  country.resources[resourceKey] = safeSubtract(country.resources[resourceKey], resourceLoss * country.scale)
  country.stability = safeSubtract(country.stability, stabilityLoss * country.scale)
  country.population = safeSubtract(country.population, 100_000_000n * country.scale)
  country.negative = name
  country.negativeEffect = `${resourceMeta.find(item => item.key === resourceKey).name}与稳定力受到冲击`
  world.doom = clampBig(world.doom + 1_000_000_000n, 0n, DOOM_CAP)
  addHistory(`${country.name}遭遇${name}`, `资源损失 ${formatBig(resourceLoss * country.scale)}`, debug ? "debug" : "danger")
  setHeadline(`${country.name}遭遇${name}，玩家支援可以加速恢复`)
  mapPulse(country.iso)
}

function applyDiscovery(country) {
  const meta = resourceMeta[hashIso(`${country.iso}${world.day}`) % resourceMeta.length]
  const gain = 500_000_000_000n * country.scale
  country.resources[meta.key] = clampBig(country.resources[meta.key] + gain, 0n, capFor(country))
  addHistory(`${country.name}发现新资源`, `${meta.name}增加 ${formatBig(gain)}`, "major")
}

function applyBreakthrough(country) {
  const gain = 700_000_000_000n * country.scale
  country.resources.tech = clampBig(country.resources.tech + gain, 0n, capFor(country))
  addHistory(`${country.name}取得科学突破`, `科研增加 ${formatBig(gain)}`, "major")
}

function applyGreatPerson(country) {
  const gain = 700_000_000_000n * country.scale
  country.resources.culture = clampBig(country.resources.culture + gain, 0n, capFor(country))
  country.stability = clampBig(country.stability + 300_000_000_000n * country.scale, 0n, stabilityCapFor(country))
  addHistory(`${country.name}出现杰出人物`, `文化增加 ${formatBig(gain)}`, "major")
}

function startIntegration(fromIso, toIso, type, debug = false) {
  if (!countries.has(fromIso) || !countries.has(toIso) || fromIso === toIso) return
  const from = countries.get(fromIso)
  const to = countries.get(toIso)
  const targetBase = type === "peace" ? 1_200_000_000n : 2_400_000_000n
  const stepBase = type === "peace" ? 120_000_000n : 240_000_000n
  world.integration = {
    from: fromIso,
    to: toIso,
    type,
    progress: 0n,
    target: targetBase * to.scale,
    segmentStep: stepBase * to.scale,
    paused: false
  }
  if (type === "force") {
    from.resources.food = safeSubtract(from.resources.food, 2_000_000_000_000n * from.scale)
    from.resources.industry = safeSubtract(from.resources.industry, 1_500_000_000_000n * from.scale)
    from.resources.military = safeSubtract(from.resources.military, 2_500_000_000_000n * from.scale)
    to.population = safeSubtract(to.population, 1_000_000_000n * to.scale)
    world.doom = clampBig(world.doom + 12_000_000_000n, 0n, DOOM_CAP)
  }
  addHistory(`${from.name}开始${type === "peace" ? "和平" : "强制"}整合${to.name}`, "时间门槛无法被资源投入直接跳过", debug ? "debug" : "major")
  setHeadline(`${from.name}与${to.name}进入国家整合进程`)
}

function startInitialIntegration() {
  if (countries.has("BRA") && countries.has("URY")) startIntegration("BRA", "URY", "peace", false)
}

function advanceIntegration() {
  const integration = world.integration
  if (!integration) return
  const from = countries.get(integration.from)
  const to = countries.get(integration.to)
  const pauseThreshold = 5_000_000_000_000n * to.scale
  integration.paused = to.stability < pauseThreshold
  if (integration.paused) return
  integration.progress += 10_000_000n
  if (integration.progress < integration.target) return
  to.owner = from.owner
  to.positive = `已加入${from.name}统一势力`
  to.positiveEffect = "地区资源与国家身份继续保留"
  addHistory(`${from.name}完成对${to.name}的整合`, "统一势力控制范围扩大", "major")
  setHeadline(`${to.name}已正式加入${from.name}统一势力`)
  mapPulse(to.iso)
  world.integration = null
}

function simulateHour() {
  if (world.ending) return
  advanceClock()
  for (const country of countries.values()) {
    adjustCountry(country)
    checkCountryEvents(country)
  }
  advanceIntegration()
  randomCountryEvent()
}

function simulationLoop() {
  if (!world.ending && world.speed > 0) {
    world.simulationAccumulator += world.speed
    while (world.simulationAccumulator >= SIMULATION_GATE) {
      simulateHour()
      world.simulationAccumulator -= SIMULATION_GATE
    }
    if (world.cooldownRemaining > 0) {
      world.cooldownRemaining -= world.speed
      if (world.cooldownRemaining < 0) world.cooldownRemaining = 0
    }
  }
  world.uiAccumulator += 1
  if (world.uiAccumulator >= 5) {
    world.uiAccumulator = 0
    renderAll()
  } else {
    renderCooldown()
  }
}

function openDebug() {
  elements.debugPanel.hidden = false
  elements.debugToggle.setAttribute("aria-expanded", "true")
}

function closeDebug() {
  elements.debugPanel.hidden = true
  elements.debugToggle.setAttribute("aria-expanded", "false")
}

function setSpeed(speed) {
  world.speed = speed
  for (const button of elements.speedControls.querySelectorAll("button")) button.classList.toggle("is-active", Number(button.dataset.speed) === speed)
  setHeadline(speed === 0 ? "Debug：世界进程已暂停" : `Debug：游戏速度已调整为 ×${speed}`)
}

function debugAddResource() {
  const country = countries.get(world.selectedIso)
  const key = elements.debugResource.value || world.selectedResource
  const raw = elements.debugAmount.value.replaceAll(",", "").trim()
  let amount
  try { amount = BigInt(raw) } catch { showToast("输入无效", "请输入完整正整数"); return }
  if (amount <= 0n) { showToast("输入无效", "资源增量必须大于 0"); return }
  country.resources[key] = clampBig(country.resources[key] + amount, 0n, capFor(country))
  const meta = resourceMeta.find(item => item.key === key)
  addHistory(`Debug：${country.name}增加${meta.name}`, `增加 ${formatBig(amount)}`, "debug")
  mapPulse(country.iso)
  renderAll(key)
}

function debugTriggerEvent() {
  const country = countries.get(world.selectedIso)
  const event = currentEvent(country)
  triggerHistoricalEvent(country, event, true)
  renderAll()
}

function debugIntegration(type) {
  const from = countries.get(world.selectedIso)
  const target = Array.from(countries.values()).find(country => country.iso !== from.iso && country.owner !== from.owner)
  if (!target) return
  startIntegration(from.iso, target.iso, type, true)
  renderAll()
}

function triggerEnding(type) {
  if (world.ending) return
  world.ending = true
  elements.endingOverlay.hidden = false
  elements.endingOverlay.classList.toggle("is-extinction", type === "extinction")
  if (type === "unity") {
    elements.endingKicker.textContent = "WORLD UNIFIED"
    elements.endingTitle.textContent = "世界完成大一统"
    elements.endingCopy.textContent = "全部国家进入同一统一势力，人类文明完成最终整合。"
    addHistory("大一统结局触发", "当前世界线即将归档", "major")
  } else {
    elements.endingKicker.textContent = "HUMANITY EXTINCT"
    elements.endingTitle.textContent = "人类文明终结"
    elements.endingCopy.textContent = "人口、粮食和恢复能力全部跌破最后安全线。"
    addHistory("人类大灭绝结局触发", "当前世界线即将归档", "danger")
  }
  let remaining = 5
  elements.endingCountdown.textContent = `${remaining} 秒后开启新的世界线`
  const timer = window.setInterval(() => {
    remaining -= 1
    elements.endingCountdown.textContent = `${remaining} 秒后开启新的世界线`
    if (remaining <= 0) {
      window.clearInterval(timer)
      resetWorld(true)
    }
  }, 1000)
}

function resetWorld(fromEnding = false) {
  world.line += 1
  world.year = 1
  world.month = 1
  world.day = 1
  world.hour = 0
  world.doom = 50_000_000_000n
  world.speed = 1
  world.simulationAccumulator = 0
  world.cooldownRemaining = 0
  world.integration = null
  world.history = []
  world.ending = false
  initializeCountries()
  addHistory("新的世界线启动", "国家边界与资源状态已经重置", fromEnding ? "major" : "debug")
  elements.endingOverlay.hidden = true
  setSpeed(1)
  selectCountry(countries.has("BRA") ? "BRA" : mapPaths[0].dataset.iso)
  setHeadline("新的世界线已启动，所有国家重新开始演化")
}

function bindEvents() {
  for (const path of mapPaths) {
    path.addEventListener("click", () => selectCountry(path.dataset.iso))
    path.addEventListener("pointerenter", () => {
      const country = countries.get(path.dataset.iso)
      if (country) elements.shortageHint.textContent = `${country.name} · ${shortageResource(country).name}储备最低`
    })
  }

  elements.countrySearch.addEventListener("change", () => {
    const value = elements.countrySearch.value.trim().toLocaleLowerCase()
    const country = Array.from(countries.values()).find(item => item.name.toLocaleLowerCase() === value || item.iso.toLocaleLowerCase() === value)
    if (country) selectCountry(country.iso)
  })

  elements.quantityMinus.addEventListener("click", () => {
    elements.quantityInput.value = String(clampQuantity() - 1)
    updateImpactPreview()
  })
  elements.quantityPlus.addEventListener("click", () => {
    elements.quantityInput.value = String(clampQuantity() + 1)
    updateImpactPreview()
  })
  elements.quantityInput.addEventListener("input", updateImpactPreview)
  elements.quantityInput.addEventListener("change", updateImpactPreview)
  elements.supportButton.addEventListener("click", handleSupport)

  elements.debugToggle.addEventListener("click", () => elements.debugPanel.hidden ? openDebug() : closeDebug())
  elements.debugClose.addEventListener("click", closeDebug)
  elements.speedControls.addEventListener("click", event => {
    const button = event.target.closest("button[data-speed]")
    if (button) setSpeed(Number(button.dataset.speed))
  })
  document.querySelector("#debug-add").addEventListener("click", debugAddResource)
  document.querySelector("#debug-clear-cooldown").addEventListener("click", () => { world.cooldownRemaining = 0; addHistory("Debug：投放冷却已清除", "玩家可以立即再次投放", "debug"); renderCooldown() })
  document.querySelector("#debug-disaster").addEventListener("click", () => applyDisaster(countries.get(world.selectedIso), "调试级地震", "industry", 500_000_000_000n, 300_000_000_000n, true))
  document.querySelector("#debug-history").addEventListener("click", debugTriggerEvent)
  document.querySelector("#debug-peace").addEventListener("click", () => debugIntegration("peace"))
  document.querySelector("#debug-force").addEventListener("click", () => debugIntegration("force"))
  document.querySelector("#debug-unity").addEventListener("click", () => triggerEnding("unity"))
  document.querySelector("#debug-extinction").addEventListener("click", () => triggerEnding("extinction"))
  document.querySelector("#debug-reset").addEventListener("click", () => resetWorld(false))
  document.addEventListener("keydown", event => {
    if (event.key.toLocaleLowerCase() === "d" && !event.metaKey && !event.ctrlKey && !event.altKey && !(event.target instanceof HTMLInputElement)) {
      elements.debugPanel.hidden ? openDebug() : closeDebug()
    }
  })
}

function seedHistory() {
  addHistory("世界线完成初始化", "177 个国家区域开始自主运行", "major")
  addHistory("巴西与乌拉圭进入和平整合", "整合进度将按世界时间持续推进", "major")
  addHistory("全球毁灭度处于低位", "严重全球灾难尚未解锁")
}

function start() {
  makeSegments(elements.cooldownSegments)
  makeSegments(elements.eventProgress)
  makeSegments(elements.integrationProgress)
  makeSegments(elements.doomProgress)
  initializeCountries()
  buildMaterialButtons()
  bindEvents()
  seedHistory()
  selectCountry(countries.has("BRA") ? "BRA" : mapPaths[0].dataset.iso)
  updateImpactPreview()
  renderAll()
  window.setInterval(simulationLoop, 100)
  if (window.location.search.includes("debug=1")) openDebug()
}

start()
