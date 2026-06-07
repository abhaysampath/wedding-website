import { describe, it, expect } from 'vitest'
import config from './config'

describe('config', () => {
  it('has site section with couple names', () => {
    expect(config.site.coupleNames.bride).toBeTruthy()
    expect(config.site.coupleNames.groom).toBeTruthy()
  })

  it('has theme colors', () => {
    expect(config.site.theme.primary).toMatch(/^#/)
    expect(config.site.theme.background).toMatch(/^#/)
    expect(config.site.theme.accent).toMatch(/^#/)
    expect(config.site.theme.text).toMatch(/^#/)
  })

  it('has firebase config with env variable references', () => {
    expect(config.firebase.apiKey).toBeDefined()
    expect(config.firebase.authDomain).toBeDefined()
    expect(config.firebase.projectId).toBeDefined()
  })

  it('has emailjs config with env variable references', () => {
    expect(config.emailjs.serviceId).toBeDefined()
    expect(config.emailjs.templateId).toBeDefined()
    expect(config.emailjs.publicKey).toBeDefined()
  })

  it('has sheets mode set to api', () => {
    expect(config.sheets.mode).toBe('api')
  })

  it('has images.hero section', () => {
    const hero = config.images.hero
    expect(hero.dir).toMatch(/^https?:\/\//)
    expect(hero.slides.length).toBeGreaterThan(0)
    expect(hero.interval).toBeGreaterThan(0)
    hero.slides.forEach(s => {
      expect(s.file).toBeTruthy()
      expect(s.alt).toBeTruthy()
    })
  })

  it('has images.ourStory section', () => {
    const story = config.images.ourStory
    expect(story.dir).toMatch(/^https?:\/\//)
    expect(story.slides.length).toBeGreaterThan(0)
    story.slides.forEach(s => {
      expect(s.file).toBeTruthy()
      expect(s.alt).toBeTruthy()
    })
  })

  it('has images.gallery section with all sub-sections', () => {
    const gallery = config.images.gallery
    expect(gallery.home).toBeDefined()
    expect(gallery.gallery).toBeDefined()
    expect(gallery.vert).toBeDefined()
    Object.values(gallery).forEach(images => {
      images.forEach(img => {
        expect(img.file).toBeTruthy()
        expect(img.alt).toBeDefined()
      })
    })
  })

  it('has images.hero personalized entries', () => {
    const p = config.images.hero.personalized
    expect(p.groom.file).toBeTruthy()
    expect(p.bride.file).toBeTruthy()
  })

  it('has valid debug flag', () => {
    expect(typeof config.debug).toBe('boolean')
  })
})
